import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ALL_HARVESTERS, ExpenseType, FuelPumpLedger, PartyType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { allowedHarvesterIds, assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Expense } from '../expenses/expense.schema';
import { Payment } from '../payments/payment.schema';
import { FuelPump } from './fuel-pump.schema';
import { CreateFuelPumpDto, UpdateFuelPumpDto } from './dto/fuel-pump.dto';

@Injectable()
export class FuelPumpsService {
  constructor(
    @InjectRepository(FuelPump) private readonly repo: Repository<FuelPump>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
  ) {}

  /**
   * Tenant scope plus the harvester-access rules, adapted for the many-to-many
   * `harvesterIds` JSON array: a pump is visible if any of its harvesters is
   * allowed. Membership is tested with MySQL's JSON_CONTAINS.
   */
  private scopedQB(user: AuthUser, harvesterId?: string): SelectQueryBuilder<FuelPump> {
    const qb = this.repo.createQueryBuilder('p').where('p.tenantId = :tenant', {
      tenant: user.tenantId,
    });
    const allowed = allowedHarvesterIds(user); // null = all (owner)

    if (harvesterId && harvesterId !== ALL_HARVESTERS) {
      const allowedHere = !allowed || allowed.includes(harvesterId);
      if (!allowedHere) qb.andWhere('1 = 0');
      else qb.andWhere('JSON_CONTAINS(p.harvesterIds, :hid)', { hid: JSON.stringify(harvesterId) });
    } else if (allowed) {
      if (allowed.length === 0) {
        qb.andWhere('1 = 0');
      } else {
        const ors = allowed.map((_, i) => `JSON_CONTAINS(p.harvesterIds, :h${i})`).join(' OR ');
        const params: Record<string, string> = {};
        allowed.forEach((h, i) => (params[`h${i}`] = JSON.stringify(h)));
        qb.andWhere(`(${ors})`, params);
      }
    }
    return qb;
  }

  create(dto: CreateFuelPumpDto, user: AuthUser): Promise<FuelPump> {
    dto.harvesterIds.forEach((h) => assertCanUseHarvester(user, h));
    const { id, ...rest } = dto;
    return createMaybeWithId(
      this.repo,
      {
        ...rest,
        tenantId: user.tenantId,
        harvesterIds: dto.harvesterIds,
        createdBy: user.id,
        updatedBy: user.id,
      },
      id,
    );
  }

  findAll(user: AuthUser, harvesterId?: string): Promise<FuelPump[]> {
    return this.scopedQB(user, harvesterId).orderBy('p.createdAt', 'DESC').getMany();
  }

  async findOne(id: string, user: AuthUser): Promise<FuelPump> {
    const doc = await this.scopedQB(user).andWhere('p.id = :id', { id }).getOne();
    if (!doc) throw new NotFoundException('Fuel pump not found');
    return doc;
  }

  async update(id: string, dto: UpdateFuelPumpDto, user: AuthUser): Promise<FuelPump> {
    if (dto.harvesterIds) dto.harvesterIds.forEach((h) => assertCanUseHarvester(user, h));
    const doc = await this.findOne(id, user);
    Object.assign(doc, dto);
    doc.updatedBy = user.id;
    return this.repo.save(doc);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const doc = await this.findOne(id, user);
    await this.repo.remove(doc);
  }

  /** Diesel bought from this pump (bill) vs paid (from payments). */
  async ledger(pumpId: string, user: AuthUser): Promise<FuelPumpLedger> {
    const pump = await this.findOne(pumpId, user);

    // Diesel attributed to this pump, only from harvesters the user can see.
    const expenses = await this.expenses.find({
      where: {
        tenantId: user.tenantId,
        type: ExpenseType.DIESEL,
        pumpId,
        ...harvesterFilter(user),
      },
    });

    const payments = await this.payments.find({
      where: { tenantId: user.tenantId, partyType: PartyType.FUEL_PUMP, partyId: pumpId },
      order: { date: 'DESC' },
    });

    const totalBill = expenses.reduce((acc, e) => acc + e.amount, 0);
    const amountPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      pump: pump as unknown as FuelPumpLedger['pump'],
      totalBill,
      amountPaid,
      remaining: totalBill - amountPaid,
      payments: payments as unknown as FuelPumpLedger['payments'],
    };
  }
}
