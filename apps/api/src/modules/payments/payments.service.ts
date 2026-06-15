import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PartyType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Payment } from './payment.schema';
import { CreatePaymentDto, QueryPaymentDto, UpdatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(@InjectRepository(Payment) private readonly repo: Repository<Payment>) {}

  create(dto: CreatePaymentDto, user: AuthUser): Promise<Payment> {
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    const { id, ...rest } = dto;
    return createMaybeWithId(
      this.repo,
      {
        ...rest,
        tenantId: user.tenantId,
        partyId: dto.partyId,
        plotId: dto.plotId ?? null,
        harvesterId: dto.harvesterId ?? null,
        date: dto.date ?? new Date(),
        createdBy: user.id,
        updatedBy: user.id,
      },
      id,
    );
  }

  findAll(query: QueryPaymentDto, user: AuthUser): Promise<Payment[]> {
    const where: FindOptionsWhere<Payment> = {
      tenantId: user.tenantId,
      ...harvesterFilter(user, query.harvesterId),
    };
    if (query.partyType) where.partyType = query.partyType;
    if (query.partyId) where.partyId = query.partyId;
    return this.repo.find({ where, order: { date: 'DESC' } });
  }

  /** Total received from a given party within the tenant — used by the ledger. */
  async totalForParty(partyType: PartyType, partyId: string, tenantId: string): Promise<number> {
    const raw = await this.repo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where('p.partyType = :partyType AND p.partyId = :partyId AND p.tenantId = :tenantId', {
        partyType,
        partyId,
        tenantId,
      })
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }

  async findOne(id: string, tenantId: string): Promise<Payment> {
    const doc = await this.repo.findOne({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Payment not found');
    return doc;
  }

  async update(id: string, dto: UpdatePaymentDto, user: AuthUser): Promise<Payment> {
    const doc = await this.repo.findOne({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Payment not found');
    Object.assign(doc, dto);
    doc.updatedBy = user.id;
    return this.repo.save(doc);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const res = await this.repo.delete({ id, tenantId });
    if (!res.affected) throw new NotFoundException('Payment not found');
  }
}
