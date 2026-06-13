import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { PartyType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Payment, PaymentDocument } from './payment.schema';
import { CreatePaymentDto, QueryPaymentDto, UpdatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly model: Model<PaymentDocument>,
  ) {}

  private toOid(id?: string | null): Types.ObjectId | null {
    return id ? new Types.ObjectId(id) : null;
  }

  create(dto: CreatePaymentDto, user: AuthUser): Promise<PaymentDocument> {
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    return createMaybeWithId(
      this.model,
      {
        tenantId: new Types.ObjectId(user.tenantId),
        partyType: dto.partyType,
        partyId: new Types.ObjectId(dto.partyId),
        plotId: this.toOid(dto.plotId),
        harvesterId: this.toOid(dto.harvesterId),
        date: dto.date ?? new Date(),
        amount: dto.amount,
        notes: dto.notes,
        createdBy: new Types.ObjectId(user.id),
        updatedBy: new Types.ObjectId(user.id),
      },
      dto.id,
    );
  }

  findAll(query: QueryPaymentDto, user: AuthUser): Promise<PaymentDocument[]> {
    const filter: FilterQuery<PaymentDocument> = {
      tenantId: new Types.ObjectId(user.tenantId),
      ...harvesterFilter(user, query.harvesterId),
    };
    if (query.partyType) filter.partyType = query.partyType;
    if (query.partyId) filter.partyId = new Types.ObjectId(query.partyId);
    return this.model.find(filter).sort({ date: -1 }).exec();
  }

  /** Total received from a given party within the tenant — used by the ledger. */
  async totalForParty(partyType: PartyType, partyId: string, tenantId: string): Promise<number> {
    const [row] = await this.model.aggregate<{ total: number }>([
      {
        $match: {
          partyType,
          partyId: new Types.ObjectId(partyId),
          tenantId: new Types.ObjectId(tenantId),
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return row?.total ?? 0;
  }

  async findOne(id: string, tenantId: string): Promise<PaymentDocument> {
    const doc = await this.model
      .findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .exec();
    if (!doc) throw new NotFoundException('Payment not found');
    return doc;
  }

  async update(id: string, dto: UpdatePaymentDto, user: AuthUser): Promise<PaymentDocument> {
    const update: Record<string, unknown> = { ...dto, updatedBy: new Types.ObjectId(user.id) };
    if (dto.partyId) update.partyId = new Types.ObjectId(dto.partyId);
    if (dto.plotId !== undefined) update.plotId = this.toOid(dto.plotId);
    if (dto.harvesterId !== undefined) update.harvesterId = this.toOid(dto.harvesterId);
    const doc = await this.model
      .findOneAndUpdate({ _id: id, tenantId: new Types.ObjectId(user.tenantId) }, update, {
        new: true,
        runValidators: true,
      })
      .exec();
    if (!doc) throw new NotFoundException('Payment not found');
    return doc;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const res = await this.model
      .findOneAndDelete({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .exec();
    if (!res) throw new NotFoundException('Payment not found');
  }
}
