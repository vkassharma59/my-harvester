import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { PartyType, Role } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { harvesterFilter } from '../../common/scope';
import { Paginated, PaginationDto } from '../../common/dto/pagination.dto';
import { Payment, PaymentDocument } from '../payments/payment.schema';
import { Plot, PlotDocument } from '../plots/plot.schema';
import { Customer, CustomerDocument } from './customer.schema';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

/** A customer plus their running bill / paid / outstanding totals. */
export type CustomerWithTotals = Record<string, unknown> & {
  id: string;
  totalBill: number;
  amountPaid: number;
  outstanding: number;
};

/** Compare phones by digits only, so "98765 43210" == "9876543210". */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly model: Model<CustomerDocument>,
    @InjectModel(Plot.name) private readonly plots: Model<PlotDocument>,
    @InjectModel(Payment.name) private readonly payments: Model<PaymentDocument>,
  ) {}

  /** Rejects a customer whose phone already exists in this tenant. */
  private async assertPhoneUnique(
    tenantId: Types.ObjectId,
    phone: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: FilterQuery<CustomerDocument> = { tenantId, phone };
    if (excludeId) filter._id = { $ne: excludeId };
    const existing = await this.model.findOne(filter).exec();
    if (existing) {
      throw new ConflictException(
        `A customer with this phone number already exists (${existing.name}).`,
      );
    }
  }

  async create(dto: CreateCustomerDto, user: AuthUser): Promise<CustomerDocument> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const phone = normalizePhone(dto.phone);
    await this.assertPhoneUnique(tenantId, phone);
    return this.model.create({
      ...dto,
      phone,
      tenantId,
      createdBy: new Types.ObjectId(user.id),
      updatedBy: new Types.ObjectId(user.id),
    });
  }

  async findAll(query: PaginationDto, user: AuthUser): Promise<Paginated<CustomerWithTotals>> {
    const tenant = new Types.ObjectId(user.tenantId);
    const hFilter = harvesterFilter(user);
    const filter: FilterQuery<CustomerDocument> = { tenantId: tenant };
    const and: FilterQuery<CustomerDocument>[] = [];

    // Staff see customers who have a job on their harvester(s) OR that they
    // added themselves (so a newly added customer is visible/selectable).
    if (user.role !== Role.SUPER_ADMIN) {
      // Customers linked to the staff's jobs: plot owners AND Bhusa buyers.
      const rows = await this.plots.aggregate<{ _id: Types.ObjectId }>([
        { $match: { tenantId: tenant, ...hFilter } },
        {
          $project: {
            ids: {
              $concatArrays: [
                ['$customerId'],
                { $cond: [{ $ifNull: ['$bhusaBuyerId', false] }, ['$bhusaBuyerId'], []] },
                {
                  $map: {
                    input: { $ifNull: ['$bhusaBuyers', []] },
                    as: 'b',
                    in: '$$b.customerId',
                  },
                },
              ],
            },
          },
        },
        { $unwind: '$ids' },
        { $group: { _id: '$ids' } },
      ]);
      and.push({
        $or: [
          { _id: { $in: rows.map((r) => r._id) } },
          { createdBy: new Types.ObjectId(user.id) },
        ],
      });
    }

    if (query.search) {
      const rx = new RegExp(query.search.trim(), 'i');
      and.push({ $or: [{ name: rx }, { phone: rx }, { village: rx }] });
    }
    if (and.length) filter.$and = and;
    const { page, limit } = query;
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    // Bill = harvesting charges on plots the customer OWNS + Bhusa charges on
    // plots where they are the Bhusa BUYER (scoped to the user's harvesters);
    // amount paid is customer-level (covers both roles).
    const ids = docs.map((d) => d._id);
    const [harvestBillRows, bhusaBillRows, paidRows] = await Promise.all([
      this.plots.aggregate<{ _id: Types.ObjectId; bill: number }>([
        { $match: { tenantId: tenant, ...hFilter, customerId: { $in: ids } } },
        { $group: { _id: '$customerId', bill: { $sum: '$harvestingAmount' } } },
      ]),
      this.plots.aggregate<{ _id: Types.ObjectId; bill: number }>([
        { $match: { tenantId: tenant, ...hFilter } },
        {
          // Effective buyers: the array if present, else the legacy single field.
          $project: {
            buyers: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$bhusaBuyers', []] } }, 0] },
                '$bhusaBuyers',
                {
                  $cond: [
                    { $ifNull: ['$bhusaBuyerId', false] },
                    [{ customerId: '$bhusaBuyerId', amount: { $ifNull: ['$bhusaAmount', 0] } }],
                    [],
                  ],
                },
              ],
            },
          },
        },
        { $unwind: '$buyers' },
        { $match: { 'buyers.customerId': { $in: ids } } },
        { $group: { _id: '$buyers.customerId', bill: { $sum: '$buyers.amount' } } },
      ]),
      this.payments.aggregate<{ _id: Types.ObjectId; paid: number }>([
        {
          $match: {
            tenantId: tenant,
            partyType: { $in: [PartyType.CUSTOMER, PartyType.BHUSA_BUYER] },
            partyId: { $in: ids },
          },
        },
        { $group: { _id: '$partyId', paid: { $sum: '$amount' } } },
      ]),
    ]);
    const harvestBillMap = new Map(harvestBillRows.map((r) => [r._id.toString(), r.bill]));
    const bhusaBillMap = new Map(bhusaBillRows.map((r) => [r._id.toString(), r.bill]));
    const paidMap = new Map(paidRows.map((r) => [r._id.toString(), r.paid]));

    const items: CustomerWithTotals[] = docs.map((d) => {
      const totalBill = (harvestBillMap.get(d.id) ?? 0) + (bhusaBillMap.get(d.id) ?? 0);
      const amountPaid = paidMap.get(d.id) ?? 0;
      return {
        ...(d.toJSON() as Record<string, unknown>),
        id: d.id,
        totalBill,
        amountPaid,
        outstanding: totalBill - amountPaid,
      };
    });

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<CustomerDocument> {
    const doc = await this.model
      .findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .exec();
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }

  async update(id: string, dto: UpdateCustomerDto, user: AuthUser): Promise<CustomerDocument> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const update: Record<string, unknown> = { ...dto, updatedBy: new Types.ObjectId(user.id) };
    if (dto.phone !== undefined) {
      const phone = normalizePhone(dto.phone);
      await this.assertPhoneUnique(tenantId, phone, id);
      update.phone = phone;
    }
    const doc = await this.model
      .findOneAndUpdate({ _id: id, tenantId }, update, { new: true, runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }
}
