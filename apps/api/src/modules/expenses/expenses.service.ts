import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ExpenseType, PaymentStatus } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { HarvesterScopeService } from '../../common/harvester-scope.service';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Labour } from '../labour/labour.schema';
import { Expense } from './expense.schema';
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
    @InjectRepository(Expense) private readonly repo: Repository<Expense>,
    @InjectRepository(Labour) private readonly labourRepo: Repository<Labour>,
    private readonly hscope: HarvesterScopeService,
  ) {}

  async create(dto: CreateExpenseDto, user: AuthUser): Promise<Expense> {
    assertCanUseHarvester(user, dto.harvesterId);
    const labourId = dto.type === ExpenseType.LABOUR && dto.labourId ? dto.labourId : null;
    const categoryId = dto.categoryId ?? null;
    const pumpId = dto.type === ExpenseType.DIESEL && dto.pumpId ? dto.pumpId : null;

    const { id, ...rest } = dto;
    const expense = await createMaybeWithId(
      this.repo,
      {
        ...rest,
        tenantId: user.tenantId,
        harvesterId: dto.harvesterId,
        categoryId,
        pumpId,
        labourId,
        date: dto.date ?? new Date(),
        createdBy: user.id,
        updatedBy: user.id,
      },
      id,
    );

    if (labourId) await this.recomputeLabourStatus(labourId, user.tenantId, user.id);
    return expense;
  }

  async findAll(filter: ExpenseFilter, user: AuthUser): Promise<Expense[]> {
    const harvesterWhere = await this.hscope.where(user, filter.harvesterId);
    return this.repo.find({
      where: this.buildFilter(filter, user, harvesterWhere),
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthUser): Promise<Expense> {
    const doc = await this.repo.findOne({
      where: { id, tenantId: user.tenantId, ...harvesterFilter(user) },
    });
    if (!doc) throw new NotFoundException('Expense not found');
    return doc;
  }

  async update(id: string, dto: UpdateExpenseDto, user: AuthUser): Promise<Expense> {
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    const existing = await this.repo.findOne({
      where: { id, tenantId: user.tenantId, ...harvesterFilter(user) },
    });
    if (!existing) throw new NotFoundException('Expense not found');
    const previousLabourId = existing.labourId ?? null;

    Object.assign(existing, dto);
    if (dto.categoryId !== undefined) existing.categoryId = dto.categoryId || null;

    const resultingType = dto.type ?? existing.type;
    if (dto.type !== undefined || dto.labourId !== undefined) {
      const linkId = dto.labourId ?? existing.labourId ?? null;
      existing.labourId = resultingType === ExpenseType.LABOUR && linkId ? linkId : null;
    }
    if (dto.type !== undefined || dto.pumpId !== undefined) {
      const pid = dto.pumpId ?? existing.pumpId ?? null;
      existing.pumpId = resultingType === ExpenseType.DIESEL && pid ? pid : null;
    }
    existing.updatedBy = user.id;
    const doc = await this.repo.save(existing);

    const affected = new Set<string>();
    if (previousLabourId) affected.add(previousLabourId);
    if (doc.labourId) affected.add(doc.labourId);
    for (const lid of affected) await this.recomputeLabourStatus(lid, user.tenantId, user.id);
    return doc;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const doc = await this.repo.findOne({
      where: { id, tenantId: user.tenantId, ...harvesterFilter(user) },
    });
    if (!doc) throw new NotFoundException('Expense not found');
    await this.repo.remove(doc);
    if (doc.labourId) await this.recomputeLabourStatus(doc.labourId, user.tenantId, user.id);
  }

  /**
   * Re-derive a labourer's payment status from the labour expenses recorded
   * against them (within the tenant): PAID once paid ≥ agreed wage, PARTIAL if
   * something is paid, else PENDING.
   */
  private async recomputeLabourStatus(
    labourId: string,
    tenantId: string,
    actorId?: string,
  ): Promise<void> {
    const labour = await this.labourRepo.findOne({ where: { id: labourId, tenantId } });
    if (!labour) return;

    const agreed = labour.customAmount ?? labour.dailyWage ?? 0;
    const raw = await this.repo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount), 0)', 'paid')
      .where('e.labourId = :labourId AND e.tenantId = :tenantId AND e.type = :type', {
        labourId,
        tenantId,
        type: ExpenseType.LABOUR,
      })
      .getRawOne<{ paid: string }>();
    const paid = Number(raw?.paid ?? 0);

    let status = PaymentStatus.PENDING;
    if (agreed > 0 && paid >= agreed) status = PaymentStatus.PAID;
    else if (paid > 0) status = PaymentStatus.PARTIAL;

    labour.paymentStatus = status;
    if (actorId) labour.updatedBy = actorId;
    await this.labourRepo.save(labour);
  }

  private buildFilter(
    f: ExpenseFilter,
    user: AuthUser,
    harvesterWhere: Record<string, unknown>,
  ): FindOptionsWhere<Expense> {
    const where: FindOptionsWhere<Expense> = {
      tenantId: user.tenantId,
      ...harvesterWhere,
    };
    if (f.type) where.type = f.type;
    if (f.from && f.to) where.date = Between(f.from, f.to);
    else if (f.from) where.date = MoreThanOrEqual(f.from);
    else if (f.to) where.date = LessThanOrEqual(f.to);
    return where;
  }
}
