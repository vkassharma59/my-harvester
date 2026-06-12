import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { LabourLedger, LabourListItem, PartyType, WageType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Attendance, AttendanceDocument } from '../attendance/attendance.schema';
import { Payment, PaymentDocument } from '../payments/payment.schema';
import { Labour, LabourDocument } from './labour.schema';
import { CreateLabourDto, UpdateLabourDto } from './dto/labour.dto';

@Injectable()
export class LabourService {
  constructor(
    @InjectModel(Labour.name) private readonly model: Model<LabourDocument>,
    @InjectModel(Payment.name) private readonly payments: Model<PaymentDocument>,
    @InjectModel(Attendance.name) private readonly attendance: Model<AttendanceDocument>,
  ) {}

  /** A worker's account: bill (fixed amount, or daily rate × working days) vs paid. */
  async ledger(id: string, user: AuthUser): Promise<LabourLedger> {
    const worker = await this.findOne(id, user);
    const payments = await this.payments
      .find({
        tenantId: new Types.ObjectId(user.tenantId),
        partyType: PartyType.LABOUR,
        partyId: new Types.ObjectId(id),
      })
      .sort({ date: -1 })
      .exec();

    const amountPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    // Daily workers bill per attended day; fixed workers don't use attendance.
    const totalWorkingDays =
      worker.wageType === WageType.FIXED
        ? 0
        : await this.attendance.countDocuments({
            tenantId: new Types.ObjectId(user.tenantId),
            labourId: new Types.ObjectId(id),
          });
    const totalBill =
      worker.wageType === WageType.FIXED
        ? worker.customAmount ?? 0
        : (worker.dailyWage ?? 0) * totalWorkingDays;

    return {
      labour: worker.toJSON() as unknown as LabourLedger['labour'],
      totalBill,
      amountPaid,
      remaining: totalBill - amountPaid,
      totalWorkingDays,
      payments: payments.map((p) => p.toJSON()) as unknown as LabourLedger['payments'],
    };
  }

  create(dto: CreateLabourDto, user: AuthUser): Promise<LabourDocument> {
    assertCanUseHarvester(user, dto.harvesterId);
    return this.model.create({
      ...dto,
      tenantId: new Types.ObjectId(user.tenantId),
      harvesterId: new Types.ObjectId(dto.harvesterId),
      createdBy: new Types.ObjectId(user.id),
      updatedBy: new Types.ObjectId(user.id),
    });
  }

  async findAll(user: AuthUser, harvesterId?: string): Promise<LabourListItem[]> {
    const tenant = new Types.ObjectId(user.tenantId);
    const filter: FilterQuery<LabourDocument> = {
      tenantId: tenant,
      ...harvesterFilter(user, harvesterId),
    };
    const workers = await this.model.find(filter).sort({ createdAt: -1 }).exec();
    if (!workers.length) return [];

    const ids = workers.map((w) => w._id);
    // Attended days per worker (daily wage) and payments made per worker.
    const [attRows, payRows] = await Promise.all([
      this.attendance.aggregate<{ _id: Types.ObjectId; days: number }>([
        { $match: { tenantId: tenant, labourId: { $in: ids } } },
        { $group: { _id: '$labourId', days: { $sum: 1 } } },
      ]),
      this.payments.aggregate<{ _id: Types.ObjectId; paid: number }>([
        { $match: { tenantId: tenant, partyType: PartyType.LABOUR, partyId: { $in: ids } } },
        { $group: { _id: '$partyId', paid: { $sum: '$amount' } } },
      ]),
    ]);
    const daysByWorker = new Map(attRows.map((r) => [r._id.toString(), r.days]));
    const paidByWorker = new Map(payRows.map((r) => [r._id.toString(), r.paid]));

    return workers.map((w) => {
      const days = w.wageType === WageType.FIXED ? 0 : daysByWorker.get(w._id.toString()) ?? 0;
      const totalBill =
        w.wageType === WageType.FIXED ? w.customAmount ?? 0 : (w.dailyWage ?? 0) * days;
      const amountPaid = paidByWorker.get(w._id.toString()) ?? 0;
      return {
        ...(w.toJSON() as Record<string, unknown>),
        totalBill,
        amountPaid,
        remaining: totalBill - amountPaid,
        totalWorkingDays: days,
      } as unknown as LabourListItem;
    });
  }

  async findOne(id: string, user: AuthUser): Promise<LabourDocument> {
    const doc = await this.model
      .findOne({ _id: id, tenantId: new Types.ObjectId(user.tenantId), ...harvesterFilter(user) })
      .exec();
    if (!doc) throw new NotFoundException('Labour record not found');
    return doc;
  }

  async update(id: string, dto: UpdateLabourDto, user: AuthUser): Promise<LabourDocument> {
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    const update: Record<string, unknown> = { ...dto, updatedBy: new Types.ObjectId(user.id) };
    if (dto.harvesterId) update.harvesterId = new Types.ObjectId(dto.harvesterId);
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, tenantId: new Types.ObjectId(user.tenantId), ...harvesterFilter(user) },
        update,
        { new: true, runValidators: true },
      )
      .exec();
    if (!doc) throw new NotFoundException('Labour record not found');
    return doc;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const res = await this.model
      .findOneAndDelete({
        _id: id,
        tenantId: new Types.ObjectId(user.tenantId),
        ...harvesterFilter(user),
      })
      .exec();
    if (!res) throw new NotFoundException('Labour record not found');
  }
}
