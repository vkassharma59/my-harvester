import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { LabourLedger, LabourListItem, PartyType, WageType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Attendance } from '../attendance/attendance.schema';
import { Payment } from '../payments/payment.schema';
import { Labour } from './labour.schema';
import { CreateLabourDto, UpdateLabourDto } from './dto/labour.dto';

@Injectable()
export class LabourService {
  constructor(
    @InjectRepository(Labour) private readonly repo: Repository<Labour>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Attendance) private readonly attendance: Repository<Attendance>,
  ) {}

  /** A worker's account: bill (fixed amount, or daily rate × working days) vs paid. */
  async ledger(id: string, user: AuthUser): Promise<LabourLedger> {
    const worker = await this.findOne(id, user);
    const payments = await this.payments.find({
      where: { tenantId: user.tenantId, partyType: PartyType.LABOUR, partyId: id },
      order: { date: 'DESC' },
    });

    const amountPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    // Daily workers bill per attended day; fixed workers don't use attendance.
    const totalWorkingDays =
      worker.wageType === WageType.FIXED
        ? 0
        : await this.attendance.count({ where: { tenantId: user.tenantId, labourId: id } });
    const totalBill =
      worker.wageType === WageType.FIXED
        ? worker.customAmount ?? 0
        : (worker.dailyWage ?? 0) * totalWorkingDays;

    return {
      labour: worker as unknown as LabourLedger['labour'],
      totalBill,
      amountPaid,
      remaining: totalBill - amountPaid,
      totalWorkingDays,
      payments: payments as unknown as LabourLedger['payments'],
    };
  }

  create(dto: CreateLabourDto, user: AuthUser): Promise<Labour> {
    assertCanUseHarvester(user, dto.harvesterId);
    const { id, ...rest } = dto;
    return createMaybeWithId(
      this.repo,
      {
        ...rest,
        tenantId: user.tenantId,
        harvesterId: dto.harvesterId,
        createdBy: user.id,
        updatedBy: user.id,
      },
      id,
    );
  }

  async findAll(user: AuthUser, harvesterId?: string): Promise<LabourListItem[]> {
    const tenantId = user.tenantId;
    const workers = await this.repo.find({
      where: { tenantId, ...harvesterFilter(user, harvesterId) },
      order: { createdAt: 'DESC' },
    });
    if (!workers.length) return [];

    const ids = workers.map((w) => w.id);
    // Attended days per worker (daily wage) and payments made per worker.
    const [attRows, payRows] = await Promise.all([
      this.attendance
        .createQueryBuilder('a')
        .select('a.labourId', 'id')
        .addSelect('COUNT(*)', 'days')
        .where('a.tenantId = :tenantId AND a.labourId IN (:...ids)', { tenantId, ids })
        .groupBy('a.labourId')
        .getRawMany<{ id: string; days: string }>(),
      this.payments
        .createQueryBuilder('p')
        .select('p.partyId', 'id')
        .addSelect('COALESCE(SUM(p.amount), 0)', 'paid')
        .where('p.tenantId = :tenantId AND p.partyType = :pt AND p.partyId IN (:...ids)', {
          tenantId,
          pt: PartyType.LABOUR,
          ids,
        })
        .groupBy('p.partyId')
        .getRawMany<{ id: string; paid: string }>(),
    ]);
    const daysByWorker = new Map(attRows.map((r) => [r.id, Number(r.days)]));
    const paidByWorker = new Map(payRows.map((r) => [r.id, Number(r.paid)]));

    return workers.map((w) => {
      const days = w.wageType === WageType.FIXED ? 0 : daysByWorker.get(w.id) ?? 0;
      const totalBill = w.wageType === WageType.FIXED ? w.customAmount ?? 0 : (w.dailyWage ?? 0) * days;
      const amountPaid = paidByWorker.get(w.id) ?? 0;
      return {
        ...w,
        totalBill,
        amountPaid,
        remaining: totalBill - amountPaid,
        totalWorkingDays: days,
      } as unknown as LabourListItem;
    });
  }

  async findOne(id: string, user: AuthUser): Promise<Labour> {
    const doc = await this.repo.findOne({
      where: { id, tenantId: user.tenantId, ...harvesterFilter(user) },
    });
    if (!doc) throw new NotFoundException('Labour record not found');
    return doc;
  }

  async update(id: string, dto: UpdateLabourDto, user: AuthUser): Promise<Labour> {
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    const doc = await this.findOne(id, user);
    Object.assign(doc, dto);
    doc.updatedBy = user.id;
    return this.repo.save(doc);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const doc = await this.findOne(id, user);
    await this.repo.remove(doc);
  }
}
