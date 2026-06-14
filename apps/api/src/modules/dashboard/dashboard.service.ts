import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Not, Repository } from 'typeorm';
import {
  ALL_HARVESTERS,
  CustomerLedger,
  DashboardSummary,
  ExpenseType,
  PartyType,
  WageType,
} from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { harvesterFilter } from '../../common/scope';
import { Attendance } from '../attendance/attendance.schema';
import { Customer } from '../customers/customer.schema';
import { ExpenseCategory } from '../expense-categories/expense-category.schema';
import { Expense } from '../expenses/expense.schema';
import { Labour } from '../labour/labour.schema';
import { Payment } from '../payments/payment.schema';
import { Plot } from '../plots/plot.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Plot) private readonly plots: Repository<Plot>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Labour) private readonly labour: Repository<Labour>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(ExpenseCategory) private readonly expenseCategories: Repository<ExpenseCategory>,
    @InjectRepository(Attendance) private readonly attendance: Repository<Attendance>,
  ) {}

  async summary(user: AuthUser, harvesterId?: string): Promise<DashboardSummary> {
    // Scope by tenant + the user's harvester access (staff see only theirs).
    const hScope = { tenantId: user.tenantId, ...harvesterFilter(user, harvesterId) };

    // Pull the scoped jobs once; derive earnings, commission, area, plots, customers.
    const plots = await this.plots.find({ where: hScope as FindOptionsWhere<Plot> });
    const totalEarnings = plots.reduce((a, p) => a + (p.totalAmount ?? 0), 0);
    const agentCommission = plots.reduce((a, p) => a + (p.commissionAmount ?? 0), 0);
    const totalArea = plots.reduce((a, p) => a + (p.area ?? 0), 0);
    const totalPlots = plots.length;
    const customerSet = new Set(plots.map((p) => p.customerId));

    // Worker payments are tracked in the worker ledger, not as expenses.
    const builtins = await this.expenses.find({
      where: { ...hScope, type: Not(ExpenseType.LABOUR), categoryId: IsNull() } as FindOptionsWhere<Expense>,
      select: { type: true, amount: true },
    });
    const expensesByType: Record<ExpenseType, number> = {
      [ExpenseType.DIESEL]: 0,
      [ExpenseType.LABOUR]: 0,
      [ExpenseType.SPARE_PARTS]: 0,
      [ExpenseType.OTHER]: 0,
    };
    let expenseTotal = 0;
    for (const e of builtins) {
      expensesByType[e.type] += e.amount;
      expenseTotal += e.amount;
    }
    // Agent commission is a real cost: include it among expenses / net profit.
    const totalExpenses = expenseTotal + agentCommission;

    const receivedFromCustomers =
      (await this.payments.sum('amount', {
        ...hScope,
        partyType: In([PartyType.CUSTOMER, PartyType.BHUSA_BUYER]),
      } as FindOptionsWhere<Payment>)) ?? 0;

    // Custom categories: sum per category, then label it.
    const customRows = await this.expenses.find({
      where: { ...hScope, categoryId: Not(IsNull()) } as FindOptionsWhere<Expense>,
      select: { categoryId: true, amount: true },
    });
    const amountByCat = new Map<string, number>();
    for (const e of customRows) {
      if (e.categoryId) amountByCat.set(e.categoryId, (amountByCat.get(e.categoryId) ?? 0) + e.amount);
    }
    const categories = await this.expenseCategories.find({
      where: { tenantId: user.tenantId },
      order: { name: 'ASC' },
    });
    // Show every active category (even at 0) plus any inactive one that still
    // carries spend, so totals stay honest after a category is removed.
    const customExpenses = categories
      .filter((c) => c.isActive || (amountByCat.get(c.id) ?? 0) > 0)
      .map((c) => ({ id: c.id, name: c.name, amount: amountByCat.get(c.id) ?? 0 }));

    // Labour cost: fixed workers bill a flat amount; daily workers rate × attended days.
    const labourRows = await this.labour.find({
      where: hScope as FindOptionsWhere<Labour>,
      select: { id: true, dailyWage: true, customAmount: true, wageType: true },
    });
    const fixedCost = labourRows
      .filter((l) => l.wageType === WageType.FIXED)
      .reduce((acc, l) => acc + (l.customAmount ?? 0), 0);
    const dailyWorkers = labourRows.filter((l) => l.wageType !== WageType.FIXED);
    let dailyCost = 0;
    if (dailyWorkers.length) {
      const dailyIds = dailyWorkers.map((l) => l.id);
      const rows = await this.attendance.find({
        where: { tenantId: user.tenantId, labourId: In(dailyIds) },
        select: { labourId: true },
      });
      const daysByWorker = new Map<string, number>();
      for (const r of rows) daysByWorker.set(r.labourId, (daysByWorker.get(r.labourId) ?? 0) + 1);
      dailyCost = dailyWorkers.reduce(
        (acc, l) => acc + (l.dailyWage ?? 0) * (daysByWorker.get(l.id) ?? 0),
        0,
      );
    }
    const totalWorkerCost = fixedCost + dailyCost;
    const workerIds = labourRows.map((l) => l.id);
    const workerPaid = workerIds.length
      ? (await this.payments.sum('amount', {
          tenantId: user.tenantId,
          partyType: PartyType.LABOUR,
          partyId: In(workerIds),
        })) ?? 0
      : 0;

    return {
      harvesterId: harvesterId && harvesterId !== ALL_HARVESTERS ? harvesterId : ALL_HARVESTERS,
      financial: {
        totalEarnings,
        totalExpenses,
        netProfit: totalEarnings - totalExpenses,
        pendingReceivables: Math.max(0, totalEarnings - receivedFromCustomers),
        agentCommission,
      },
      harvesting: {
        totalCustomers: customerSet.size,
        totalPlots,
        totalArea,
        totalJobsCompleted: totalPlots,
      },
      expenses: expensesByType,
      customExpenses,
      labour: {
        totalCost: totalWorkerCost,
        amountPaid: workerPaid,
        remaining: totalWorkerCost - workerPaid,
      },
    };
  }

  async customerLedger(customerId: string, user: AuthUser): Promise<CustomerLedger> {
    const customer = await this.customers.findOne({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Jobs the customer owns (harvesting bill) plus jobs where they buy the
    // Bhusa (Bhusa bill). Staff only see jobs on their assigned harvesters.
    const scoped = await this.plots.find({
      where: { tenantId: user.tenantId, ...harvesterFilter(user) } as FindOptionsWhere<Plot>,
    });
    const isBuyer = (p: Plot): boolean =>
      p.bhusaBuyers?.length
        ? p.bhusaBuyers.some((b) => b.customerId === customerId)
        : p.bhusaBuyerId === customerId;
    const plots = scoped
      .filter((p) => p.customerId === customerId || isBuyer(p))
      .sort((a, b) => new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime());

    const payments = await this.payments.find({
      where: {
        tenantId: user.tenantId,
        partyType: In([PartyType.CUSTOMER, PartyType.BHUSA_BUYER]),
        partyId: customerId,
      },
      order: { date: 'DESC' },
    });

    // The Bhusa amount this customer owes on a job (their share, or legacy single).
    const bhusaOwed = (p: Plot): number => {
      if (p.bhusaBuyers?.length) {
        return p.bhusaBuyers.filter((b) => b.customerId === customerId).reduce((a, b) => a + b.amount, 0);
      }
      return p.bhusaBuyerId === customerId ? p.bhusaAmount ?? 0 : 0;
    };
    const totalBillAmount = plots.reduce(
      (acc, p) => acc + (p.customerId === customerId ? p.harvestingAmount : bhusaOwed(p)),
      0,
    );
    const totalHarvestedArea = plots.reduce(
      (acc, p) => acc + (p.customerId === customerId ? p.area : 0),
      0,
    );
    const amountPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      customer: customer as unknown as CustomerLedger['customer'],
      totalHarvestedArea,
      plots: plots as unknown as CustomerLedger['plots'],
      totalBillAmount,
      amountPaid,
      outstanding: totalBillAmount - amountPaid,
      payments: payments as unknown as CustomerLedger['payments'],
    };
  }
}
