import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { Attendance, AttendanceDocument } from '../attendance/attendance.schema';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from '../expense-categories/expense-category.schema';
import { Expense, ExpenseDocument } from '../expenses/expense.schema';
import { Labour, LabourDocument } from '../labour/labour.schema';
import { Payment, PaymentDocument } from '../payments/payment.schema';
import { Plot, PlotDocument } from '../plots/plot.schema';

async function sum(
  model: Model<any>,
  match: Record<string, unknown>,
  field: string,
): Promise<number> {
  const [row] = await model.aggregate<{ total: number }>([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return row?.total ?? 0;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Plot.name) private readonly plots: Model<PlotDocument>,
    @InjectModel(Expense.name) private readonly expenses: Model<ExpenseDocument>,
    @InjectModel(Labour.name) private readonly labour: Model<LabourDocument>,
    @InjectModel(Payment.name) private readonly payments: Model<PaymentDocument>,
    @InjectModel(Customer.name) private readonly customers: Model<CustomerDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly expenseCategories: Model<ExpenseCategoryDocument>,
    @InjectModel(Attendance.name) private readonly attendance: Model<AttendanceDocument>,
  ) {}

  async summary(user: AuthUser, harvesterId?: string): Promise<DashboardSummary> {
    // Scope by tenant + the user's harvester access (staff see only theirs).
    const hMatch: Record<string, unknown> = {
      tenantId: new Types.ObjectId(user.tenantId),
      ...harvesterFilter(user, harvesterId),
    };

    const totalEarnings = await sum(this.plots, hMatch, 'totalAmount');
    // Worker payments are tracked in the worker ledger, not as expenses.
    const nonLabour = { type: { $ne: ExpenseType.LABOUR } };
    const expenseTotal = await sum(this.expenses, { ...hMatch, ...nonLabour }, 'amount');
    // Agent commission is a real cost: include it among expenses / net profit.
    const agentCommission = await sum(this.plots, hMatch, 'commissionAmount');
    const totalExpenses = expenseTotal + agentCommission;

    const receivedFromCustomers = await sum(
      this.payments,
      { ...hMatch, partyType: { $in: [PartyType.CUSTOMER, PartyType.BHUSA_BUYER] } },
      'amount',
    );

    // Built-in types only (categoryId null also matches legacy docs with no field).
    const expenseRows = await this.expenses.aggregate<{ _id: ExpenseType; total: number }>([
      { $match: { ...hMatch, ...nonLabour, categoryId: null } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const expensesByType: Record<ExpenseType, number> = {
      [ExpenseType.DIESEL]: 0,
      [ExpenseType.LABOUR]: 0,
      [ExpenseType.SPARE_PARTS]: 0,
      [ExpenseType.OTHER]: 0,
    };
    for (const r of expenseRows) expensesByType[r._id] = r.total;

    // Custom (super-admin-defined) categories: sum per category, then label it.
    const customRows = await this.expenses.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { ...hMatch, categoryId: { $ne: null } } },
      { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
    ]);
    const amountByCat = new Map(customRows.map((r) => [r._id.toString(), r.total]));
    const categories = await this.expenseCategories
      .find({ tenantId: new Types.ObjectId(user.tenantId) })
      .sort({ name: 1 })
      .exec();
    // Show every active category (even at 0) plus any inactive one that still
    // carries spend, so totals stay honest after a category is removed.
    const customExpenses = categories
      .filter((c) => c.isActive || (amountByCat.get(c.id) ?? 0) > 0)
      .map((c) => ({ id: c.id, name: c.name, amount: amountByCat.get(c.id) ?? 0 }));

    const [hStats] = await this.plots.aggregate<{
      totalArea: number;
      totalPlots: number;
      customers: Types.ObjectId[];
    }>([
      { $match: hMatch },
      {
        $group: {
          _id: null,
          totalArea: { $sum: '$area' },
          totalPlots: { $sum: 1 },
          customers: { $addToSet: '$customerId' },
        },
      },
    ]);

    const labourRows = await this.labour.find(hMatch).select('dailyWage customAmount wageType').exec();
    // Fixed workers bill a flat amount; daily workers bill rate × attended days.
    const fixedCost = labourRows
      .filter((l) => l.wageType === WageType.FIXED)
      .reduce((acc, l) => acc + (l.customAmount ?? 0), 0);
    const dailyWorkers = labourRows.filter((l) => l.wageType !== WageType.FIXED);
    let dailyCost = 0;
    if (dailyWorkers.length) {
      const counts = await this.attendance.aggregate<{ _id: Types.ObjectId; days: number }>([
        {
          $match: {
            tenantId: new Types.ObjectId(user.tenantId),
            labourId: { $in: dailyWorkers.map((l) => l._id) },
          },
        },
        { $group: { _id: '$labourId', days: { $sum: 1 } } },
      ]);
      const daysByWorker = new Map(counts.map((c) => [c._id.toString(), c.days]));
      dailyCost = dailyWorkers.reduce(
        (acc, l) => acc + (l.dailyWage ?? 0) * (daysByWorker.get(l._id.toString()) ?? 0),
        0,
      );
    }
    const totalWorkerCost = fixedCost + dailyCost;
    const workerIds = labourRows.map((l) => l._id);
    const workerPaid = await sum(
      this.payments,
      {
        tenantId: new Types.ObjectId(user.tenantId),
        partyType: PartyType.LABOUR,
        partyId: { $in: workerIds },
      },
      'amount',
    );

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
        totalCustomers: hStats?.customers.length ?? 0,
        totalPlots: hStats?.totalPlots ?? 0,
        totalArea: hStats?.totalArea ?? 0,
        totalJobsCompleted: hStats?.totalPlots ?? 0,
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
    const tenant = new Types.ObjectId(user.tenantId);
    const customer = await this.customers.findOne({ _id: customerId, tenantId: tenant }).exec();
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const cId = new Types.ObjectId(customerId);
    // Jobs the customer owns (harvesting bill) plus jobs where they buy the
    // Bhusa (Bhusa bill). Staff only see jobs on their assigned harvesters.
    const plots = await this.plots
      .find({
        tenantId: tenant,
        ...harvesterFilter(user),
        $or: [{ customerId: cId }, { bhusaBuyerId: cId }, { 'bhusaBuyers.customerId': cId }],
      })
      .sort({ harvestDate: -1 })
      .exec();

    const payments = await this.payments
      .find({
        tenantId: tenant,
        partyType: { $in: [PartyType.CUSTOMER, PartyType.BHUSA_BUYER] },
        partyId: cId,
      })
      .sort({ date: -1 })
      .exec();

    // The Bhusa amount this customer owes on a job (their share, or legacy single).
    const bhusaOwed = (p: PlotDocument): number => {
      if (p.bhusaBuyers?.length) {
        return p.bhusaBuyers.filter((b) => b.customerId.equals(cId)).reduce((a, b) => a + b.amount, 0);
      }
      return p.bhusaBuyerId?.equals(cId) ? p.bhusaAmount ?? 0 : 0;
    };
    // Owned jobs bill the harvesting amount; Bhusa-buyer jobs bill the Bhusa share.
    const totalBillAmount = plots.reduce(
      (acc, p) => acc + (p.customerId.equals(cId) ? p.harvestingAmount : bhusaOwed(p)),
      0,
    );
    const totalHarvestedArea = plots.reduce(
      (acc, p) => acc + (p.customerId.equals(cId) ? p.area : 0),
      0,
    );
    const amountPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      customer: customer.toJSON() as unknown as CustomerLedger['customer'],
      totalHarvestedArea,
      plots: plots.map((p) => p.toJSON()) as unknown as CustomerLedger['plots'],
      totalBillAmount,
      amountPaid,
      outstanding: totalBillAmount - amountPaid,
      payments: payments.map((p) => p.toJSON()) as unknown as CustomerLedger['payments'],
    };
  }
}
