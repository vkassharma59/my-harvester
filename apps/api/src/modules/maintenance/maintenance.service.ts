import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityTarget, In, ObjectLiteral, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AdminsService } from '../admins/admins.service';
import { AdminHarvester } from '../admins/admin-harvester.schema';
import { Agent } from '../agents/agent.schema';
import { Attendance } from '../attendance/attendance.schema';
import { Customer } from '../customers/customer.schema';
import { ExpenseCategory } from '../expense-categories/expense-category.schema';
import { Expense } from '../expenses/expense.schema';
import { FuelPumpHarvester } from '../fuel-pumps/fuel-pump-harvester.schema';
import { FuelPump } from '../fuel-pumps/fuel-pump.schema';
import { Harvester } from '../harvesters/harvester.schema';
import { Labour } from '../labour/labour.schema';
import { Payment } from '../payments/payment.schema';
import { PlotBhusaBuyer } from '../plots/plot-bhusa-buyer.schema';
import { Plot } from '../plots/plot.schema';
import { AppSettings } from '../settings/settings.schema';

export interface ClearDataResult {
  deleted: Record<string, number>;
}

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Harvester) private readonly harvesters: Repository<Harvester>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Labour) private readonly labour: Repository<Labour>,
    @InjectRepository(Plot) private readonly plots: Repository<Plot>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(AppSettings) private readonly settings: Repository<AppSettings>,
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(FuelPump) private readonly fuelPumps: Repository<FuelPump>,
    @InjectRepository(ExpenseCategory) private readonly expenseCategories: Repository<ExpenseCategory>,
    @InjectRepository(Attendance) private readonly attendance: Repository<Attendance>,
    private readonly admins: AdminsService,
  ) {}

  /**
   * Wipes all business data for one tenant after re-confirming the owner's
   * password. Admin accounts are intentionally preserved — only operational
   * records are removed.
   */
  async clearTenantData(user: AuthUser, password: string): Promise<ClearDataResult> {
    if (!(await this.admins.verifyPassword(user.id, password))) {
      throw new UnauthorizedException('Incorrect password.');
    }
    const tenantId = user.tenantId;
    const deleted: Record<string, number> = {};

    // One transaction so a failure can't half-wipe the tenant. FK checks are
    // disabled for its duration: these tables reference each other (and a stray
    // cross-tenant row could otherwise block a delete), and we're removing the
    // whole set together.
    await this.harvesters.manager.transaction(async (em) => {
      await em.query('SET FOREIGN_KEY_CHECKS = 0');
      try {
        // Join tables have no tenantId — clear them by this tenant's parents.
        const plotIds = (await em.find(Plot, { where: { tenantId }, select: { id: true } })).map((p) => p.id);
        const pumpIds = (await em.find(FuelPump, { where: { tenantId }, select: { id: true } })).map((p) => p.id);
        const harvIds = (await em.find(Harvester, { where: { tenantId }, select: { id: true } })).map((h) => h.id);
        if (plotIds.length) await em.delete(PlotBhusaBuyer, { plotId: In(plotIds) });
        if (pumpIds.length) await em.delete(FuelPumpHarvester, { pumpId: In(pumpIds) });
        if (harvIds.length) await em.delete(AdminHarvester, { harvesterId: In(harvIds) });

        const targets: [string, EntityTarget<ObjectLiteral>][] = [
          ['plots', Plot],
          ['payments', Payment],
          ['expenses', Expense],
          ['labour', Labour],
          ['attendance', Attendance],
          ['agents', Agent],
          ['fuelPumps', FuelPump],
          ['expenseCategories', ExpenseCategory],
          ['customers', Customer],
          ['harvesters', Harvester],
          ['settings', AppSettings],
        ];
        for (const [name, entity] of targets) {
          const res = await em.delete(entity, { tenantId });
          deleted[name] = res.affected ?? 0;
        }
      } finally {
        await em.query('SET FOREIGN_KEY_CHECKS = 1');
      }
    });

    return { deleted };
  }
}
