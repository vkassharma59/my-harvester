import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ALL_HARVESTERS, ExpenseType, FuelPumpLedger, PartyType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { allowedHarvesterIds, assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Expense, ExpenseDocument } from '../expenses/expense.schema';
import { Payment, PaymentDocument } from '../payments/payment.schema';
import { FuelPump, FuelPumpDocument } from './fuel-pump.schema';
import { CreateFuelPumpDto, UpdateFuelPumpDto } from './dto/fuel-pump.dto';

@Injectable()
export class FuelPumpsService {
  constructor(
    @InjectModel(FuelPump.name) private readonly model: Model<FuelPumpDocument>,
    @InjectModel(Expense.name) private readonly expenses: Model<ExpenseDocument>,
    @InjectModel(Payment.name) private readonly payments: Model<PaymentDocument>,
  ) {}

  /**
   * Tenant scope plus the harvester-access rules, adapted for the many-to-many
   * `harvesterIds` array: a pump is visible if any of its harvesters is allowed.
   */
  private scope(user: AuthUser, harvesterId?: string): FilterQuery<FuelPumpDocument> {
    const filter: FilterQuery<FuelPumpDocument> = {
      tenantId: new Types.ObjectId(user.tenantId),
    };
    const allowed = allowedHarvesterIds(user); // null = all (super admin)

    if (harvesterId && harvesterId !== ALL_HARVESTERS) {
      const allowedHere = !allowed || allowed.some((a) => a.toString() === harvesterId);
      // Matching a single id against an array field tests membership.
      filter.harvesterIds = allowedHere
        ? new Types.ObjectId(harvesterId)
        : { $in: [] as Types.ObjectId[] };
    } else if (allowed) {
      filter.harvesterIds = { $in: allowed };
    }
    return filter;
  }

  create(dto: CreateFuelPumpDto, user: AuthUser): Promise<FuelPumpDocument> {
    dto.harvesterIds.forEach((h) => assertCanUseHarvester(user, h));
    const { id, ...rest } = dto;
    return createMaybeWithId(
      this.model,
      {
        ...rest,
        tenantId: new Types.ObjectId(user.tenantId),
        harvesterIds: dto.harvesterIds.map((h) => new Types.ObjectId(h)),
        createdBy: new Types.ObjectId(user.id),
        updatedBy: new Types.ObjectId(user.id),
      },
      id,
    );
  }

  findAll(user: AuthUser, harvesterId?: string): Promise<FuelPumpDocument[]> {
    return this.model.find(this.scope(user, harvesterId)).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, user: AuthUser): Promise<FuelPumpDocument> {
    const doc = await this.model.findOne({ _id: id, ...this.scope(user) }).exec();
    if (!doc) throw new NotFoundException('Fuel pump not found');
    return doc;
  }

  async update(id: string, dto: UpdateFuelPumpDto, user: AuthUser): Promise<FuelPumpDocument> {
    if (dto.harvesterIds) dto.harvesterIds.forEach((h) => assertCanUseHarvester(user, h));
    const update: Record<string, unknown> = { ...dto, updatedBy: new Types.ObjectId(user.id) };
    if (dto.harvesterIds) update.harvesterIds = dto.harvesterIds.map((h) => new Types.ObjectId(h));

    const doc = await this.model
      .findOneAndUpdate({ _id: id, ...this.scope(user) }, update, {
        new: true,
        runValidators: true,
      })
      .exec();
    if (!doc) throw new NotFoundException('Fuel pump not found');
    return doc;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const res = await this.model.findOneAndDelete({ _id: id, ...this.scope(user) }).exec();
    if (!res) throw new NotFoundException('Fuel pump not found');
  }

  /** Diesel bought from this pump (bill) vs paid (from payments). */
  async ledger(pumpId: string, user: AuthUser): Promise<FuelPumpLedger> {
    const tenant = new Types.ObjectId(user.tenantId);
    const pump = await this.findOne(pumpId, user);

    // Diesel attributed to this pump, only from harvesters the user can see.
    const expenses = await this.expenses
      .find({
        tenantId: tenant,
        type: ExpenseType.DIESEL,
        pumpId: new Types.ObjectId(pumpId),
        ...harvesterFilter(user),
      })
      .exec();

    const payments = await this.payments
      .find({ tenantId: tenant, partyType: PartyType.FUEL_PUMP, partyId: new Types.ObjectId(pumpId) })
      .sort({ date: -1 })
      .exec();

    const totalBill = expenses.reduce((acc, e) => acc + e.amount, 0);
    const amountPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      pump: pump.toJSON() as unknown as FuelPumpLedger['pump'],
      totalBill,
      amountPaid,
      remaining: totalBill - amountPaid,
      payments: payments.map((p) => p.toJSON()) as unknown as FuelPumpLedger['payments'],
    };
  }
}
