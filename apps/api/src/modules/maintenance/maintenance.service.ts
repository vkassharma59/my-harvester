import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { LinksService } from '../../common/links.service';
import { AdminsService } from '../admins/admins.service';
import { Agent } from '../agents/agent.schema';
import { Attendance } from '../attendance/attendance.schema';
import { Customer } from '../customers/customer.schema';
import { ExpenseCategory } from '../expense-categories/expense-category.schema';
import { Expense } from '../expenses/expense.schema';
import { FuelPump } from '../fuel-pumps/fuel-pump.schema';
import { Harvester } from '../harvesters/harvester.schema';
import { Labour } from '../labour/labour.schema';
import { Payment } from '../payments/payment.schema';
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
    private readonly links: LinksService,
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
    // Clear join rows for the tenant's plots/pumps first (no FK cascade yet).
    const plotIds = (await this.plots.find({ where: { tenantId }, select: { id: true } })).map((p) => p.id);
    const pumpIds = (await this.fuelPumps.find({ where: { tenantId }, select: { id: true } })).map((p) => p.id);
    await this.links.clearPlotBhusaForPlots(plotIds);
    await this.links.clearPumpHarvestersForPumps(pumpIds);

    const targets: [string, Repository<ObjectLiteral>][] = [
      ['plots', this.plots],
      ['payments', this.payments],
      ['expenses', this.expenses],
      ['labour', this.labour],
      ['attendance', this.attendance],
      ['agents', this.agents],
      ['fuelPumps', this.fuelPumps],
      ['expenseCategories', this.expenseCategories],
      ['customers', this.customers],
      ['harvesters', this.harvesters],
      ['settings', this.settings],
    ];

    const deleted: Record<string, number> = {};
    for (const [name, repo] of targets) {
      const res = await repo.delete({ tenantId });
      deleted[name] = res.affected ?? 0;
    }
    return { deleted };
  }
}
