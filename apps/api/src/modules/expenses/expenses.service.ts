import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ExpenseType, PaymentStatus } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Labour, LabourDocument } from '../labour/labour.schema';
import { Expense, ExpenseDocument } from './expense.schema';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

export interface ExpenseFilter {
  harvesterId?: string;
  type?: ExpenseType;
  from?: Date;
  to?: Date;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private readonly model: Model<ExpenseDocument>,
    @InjectModel(Labour.name) private readonly labourModel: Model<LabourDocument>,
  ) {}

  async create(dto: CreateExpenseDto, user: AuthUser): Promise<ExpenseDocument> {
    assertCanUseHarvester(user, dto.harvesterId);
    const tenantId = new Types.ObjectId(user.tenantId);
    const labourId =
      dto.type === ExpenseType.LABOUR && dto.labourId ? new Types.ObjectId(dto.labourId) : null;
    const categoryId = dto.categoryId ? new Types.ObjectId(dto.categoryId) : null;
    const pumpId =
      dto.type === ExpenseType.DIESEL && dto.pumpId ? new Types.ObjectId(dto.pumpId) : null;

    const { id, ...rest } = dto;
    const expense = await createMaybeWithId(
      this.model,
      {
        ...rest,
        tenantId,
        harvesterId: new Types.ObjectId(dto.harvesterId),
        categoryId,
        pumpId,
        labourId,
        date: dto.date ?? new Date(),
        createdBy: new Types.ObjectId(user.id),
        updatedBy: new Types.ObjectId(user.id),
      },
      id,
    );

    if (labourId) await this.recomputeLabourStatus(labourId, tenantId, user.id);
    return expense;
  }

  findAll(filter: ExpenseFilter, user: AuthUser): Promise<ExpenseDocument[]> {
    return this.model.find(this.buildFilter(filter, user)).sort({ date: -1 }).exec();
  }

  async findOne(id: string, user: AuthUser): Promise<ExpenseDocument> {
    const doc = await this.model
      .findOne({ _id: id, tenantId: new Types.ObjectId(user.tenantId), ...harvesterFilter(user) })
      .exec();
    if (!doc) throw new NotFoundException('Expense not found');
    return doc;
  }

  async update(id: string, dto: UpdateExpenseDto, user: AuthUser): Promise<ExpenseDocument> {
    const tenantId = new Types.ObjectId(user.tenantId);
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    const existing = await this.model
      .findOne({ _id: id, tenantId, ...harvesterFilter(user) })
      .exec();
    if (!existing) throw new NotFoundException('Expense not found');
    const previousLabourId = existing.labourId ?? null;

    const update: Record<string, unknown> = { ...dto, updatedBy: new Types.ObjectId(user.id) };
    if (dto.harvesterId) update.harvesterId = new Types.ObjectId(dto.harvesterId);
    if (dto.categoryId !== undefined)
      update.categoryId = dto.categoryId ? new Types.ObjectId(dto.categoryId) : null;

    const resultingType = dto.type ?? existing.type;
    if (dto.type !== undefined || dto.labourId !== undefined) {
      const linkId = dto.labourId ?? existing.labourId?.toString();
      update.labourId =
        resultingType === ExpenseType.LABOUR && linkId ? new Types.ObjectId(linkId) : null;
    }
    if (dto.type !== undefined || dto.pumpId !== undefined) {
      const pid = dto.pumpId ?? existing.pumpId?.toString();
      update.pumpId =
        resultingType === ExpenseType.DIESEL && pid ? new Types.ObjectId(pid) : null;
    }

    const doc = await this.model
      .findOneAndUpdate({ _id: id, tenantId }, update, { new: true, runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException('Expense not found');

    const affected = new Set<string>();
    if (previousLabourId) affected.add(previousLabourId.toString());
    if (doc.labourId) affected.add(doc.labourId.toString());
    for (const lid of affected) {
      await this.recomputeLabourStatus(new Types.ObjectId(lid), tenantId, user.id);
    }
    return doc;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const doc = await this.model
      .findOneAndDelete({ _id: id, tenantId, ...harvesterFilter(user) })
      .exec();
    if (!doc) throw new NotFoundException('Expense not found');
    if (doc.labourId) await this.recomputeLabourStatus(doc.labourId, tenantId, user.id);
  }

  /**
   * Re-derive a labourer's payment status from the labour expenses recorded
   * against them (within the tenant): PAID once paid ≥ agreed wage, PARTIAL if
   * something is paid, else PENDING.
   */
  private async recomputeLabourStatus(
    labourId: Types.ObjectId,
    tenantId: Types.ObjectId,
    actorId?: string,
  ): Promise<void> {
    const labour = await this.labourModel.findOne({ _id: labourId, tenantId }).exec();
    if (!labour) return;

    const agreed = labour.customAmount ?? labour.dailyWage ?? 0;
    const [row] = await this.model.aggregate<{ paid: number }>([
      { $match: { labourId, tenantId, type: ExpenseType.LABOUR } },
      { $group: { _id: null, paid: { $sum: '$amount' } } },
    ]);
    const paid = row?.paid ?? 0;

    let status = PaymentStatus.PENDING;
    if (agreed > 0 && paid >= agreed) status = PaymentStatus.PAID;
    else if (paid > 0) status = PaymentStatus.PARTIAL;

    labour.paymentStatus = status;
    if (actorId) labour.updatedBy = new Types.ObjectId(actorId);
    await labour.save();
  }

  private buildFilter(f: ExpenseFilter, user: AuthUser): FilterQuery<ExpenseDocument> {
    const filter: FilterQuery<ExpenseDocument> = {
      tenantId: new Types.ObjectId(user.tenantId),
      ...harvesterFilter(user, f.harvesterId),
    };
    if (f.type) filter.type = f.type;
    if (f.from || f.to) {
      filter.date = {};
      if (f.from) filter.date.$gte = f.from;
      if (f.to) filter.date.$lte = f.to;
    }
    return filter;
  }
}
