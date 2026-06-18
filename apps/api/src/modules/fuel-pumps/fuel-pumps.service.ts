import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { ALL_HARVESTERS, ExpenseType, FuelPumpLedger, FuelPumpListItem, PartyType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { HarvesterScopeService } from '../../common/harvester-scope.service';
import { createMaybeWithId } from '../../common/idempotent';
import { LinksService } from '../../common/links.service';
import { allowedHarvesterIds, assertCanUseHarvester } from '../../common/scope';
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
    private readonly hscope: HarvesterScopeService,
    private readonly links: LinksService,
  ) {}

  /**
   * The pump ids the user may see (via the fuel_pump_harvesters join table),
   * or `null` for "no restriction" (an owner viewing all harvesters).
   */
  private async visiblePumpIds(user: AuthUser, requested?: string): Promise<string[] | null> {
    const allowed = allowedHarvesterIds(user); // null = owner (all)
    if (requested && requested !== ALL_HARVESTERS) {
      const ok = !allowed || allowed.includes(requested);
      return ok ? this.links.pumpIdsForHarvesters([requested]) : [];
    }
    if (allowed) return this.links.pumpIdsForHarvesters(allowed);
    return null;
  }

  async create(dto: CreateFuelPumpDto, user: AuthUser): Promise<FuelPump> {
    dto.harvesterIds.forEach((h) => assertCanUseHarvester(user, h));
    const { id, ...rest } = dto; // harvesterIds in rest is transient → ignored by insert
    const pump = await createMaybeWithId(
      this.repo,
      { ...rest, tenantId: user.tenantId, createdBy: user.id, updatedBy: user.id },
      id,
    );
    await this.links.setPumpHarvesters(pump.id, dto.harvesterIds);
    pump.harvesterIds = dto.harvesterIds;
    return pump;
  }

  async findAll(user: AuthUser, harvesterId?: string): Promise<FuelPumpListItem[]> {
    const tenantId = user.tenantId;
    const ids = await this.visiblePumpIds(user, harvesterId);
    const where: FindOptionsWhere<FuelPump> = { tenantId };
    if (ids !== null) where.id = In(ids);
    const pumps = await this.repo.find({ where, order: { createdAt: 'DESC' } });
    await this.links.attachPumpHarvesters(pumps);
    if (!pumps.length) return [];

    const pumpIds = pumps.map((p) => p.id);
    // Diesel bought per pump (active harvesters the user sees) vs paid.
    const expenses = await this.expenses.find({
      where: {
        tenantId,
        type: ExpenseType.DIESEL,
        pumpId: In(pumpIds),
        ...(await this.hscope.where(user)),
      },
      select: { pumpId: true, amount: true },
    });
    const bill = new Map<string, number>();
    for (const e of expenses) {
      if (e.pumpId) bill.set(e.pumpId, (bill.get(e.pumpId) ?? 0) + e.amount);
    }
    const pays = await this.payments.find({
      where: { tenantId, partyType: PartyType.FUEL_PUMP, partyId: In(pumpIds) },
      select: { partyId: true, amount: true },
    });
    const paid = new Map<string, number>();
    for (const p of pays) paid.set(p.partyId, (paid.get(p.partyId) ?? 0) + p.amount);

    return pumps.map((p) => {
      const totalBill = bill.get(p.id) ?? 0;
      const amountPaid = paid.get(p.id) ?? 0;
      return { ...p, totalBill, amountPaid, remaining: totalBill - amountPaid };
    }) as unknown as FuelPumpListItem[];
  }

  async findOne(id: string, user: AuthUser): Promise<FuelPump> {
    const ids = await this.visiblePumpIds(user);
    if (ids !== null && !ids.includes(id)) throw new NotFoundException('Fuel pump not found');
    const doc = await this.repo.findOne({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Fuel pump not found');
    await this.links.attachPumpHarvesters([doc]);
    return doc;
  }

  async update(id: string, dto: UpdateFuelPumpDto, user: AuthUser): Promise<FuelPump> {
    if (dto.harvesterIds) dto.harvesterIds.forEach((h) => assertCanUseHarvester(user, h));
    const doc = await this.findOne(id, user);
    Object.assign(doc, dto);
    doc.updatedBy = user.id;
    const saved = await this.repo.save(doc);
    if (dto.harvesterIds) await this.links.setPumpHarvesters(saved.id, dto.harvesterIds);
    await this.links.attachPumpHarvesters([saved]);
    return saved;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const doc = await this.findOne(id, user);
    await this.links.setPumpHarvesters(id, []); // clear the join rows first
    await this.repo.remove(doc);
  }

  /** Diesel bought from this pump (bill) vs paid (from payments). */
  async ledger(pumpId: string, user: AuthUser): Promise<FuelPumpLedger> {
    const pump = await this.findOne(pumpId, user);

    // Diesel attributed to this pump, only from active harvesters the user sees.
    const expenses = await this.expenses.find({
      where: {
        tenantId: user.tenantId,
        type: ExpenseType.DIESEL,
        pumpId,
        ...(await this.hscope.where(user)),
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
