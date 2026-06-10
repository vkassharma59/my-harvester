import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ALL_HARVESTERS,
  CustomerLedger,
  DashboardSummary,
  ExpenseType,
  PartyType,
  PaymentStatus,
} from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { harvesterFilter } from '../../common/scope';
import { Customer, CustomerDocument } from '../customers/customer.schema';
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
  ) {}

  async summary(user: AuthUser, harvesterId?: string): Promise<DashboardSummary> {
    // Scope by tenant + the user's harvester access (staff see only theirs).
    const hMatch: Record<string, unknown> = {
      tenantId: new Types.ObjectId(user.tenantId),
      ...harvesterFilter(user, harvesterId),
    };

    const totalEarnings = await sum(this.plots, hMatch, 'totalAmount');
    const totalExpenses = await sum(this.expenses, hMatch, 'amount');

    const receivedFromCustomers = await sum(
      this.payments,
      { ...hMatch, partyType: { $in: [PartyType.CUSTOMER, PartyType.BHUSA_BUYER] } },
      'amount',
    );

    const expenseRows = await this.expenses.aggregate<{ _id: ExpenseType; total: number }>([
      { $match: hMatch },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const expensesByType: Record<ExpenseType, number> = {
      [ExpenseType.DIESEL]: 0,
      [ExpenseType.LABOUR]: 0,
      [ExpenseType.SPARE_PARTS]: 0,
      [ExpenseType.OTHER]: 0,
    };
    for (const r of expenseRows) expensesByType[r._id] = r.total;

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

    const labourRows = await this.labour
      .find(hMatch)
      .select('dailyWage customAmount paymentStatus')
      .exec();
    const labourCost = labourRows.reduce((acc, l) => acc + (l.customAmount ?? l.dailyWage ?? 0), 0);
    const labourPending = labourRows.filter((l) => l.paymentStatus !== PaymentStatus.PAID).length;

    return {
      harvesterId: harvesterId && harvesterId !== ALL_HARVESTERS ? harvesterId : ALL_HARVESTERS,
      financial: {
        totalEarnings,
        totalExpenses,
        netProfit: totalEarnings - totalExpenses,
        pendingReceivables: Math.max(0, totalEarnings - receivedFromCustomers),
      },
      harvesting: {
        totalCustomers: hStats?.customers.length ?? 0,
        totalPlots: hStats?.totalPlots ?? 0,
        totalArea: hStats?.totalArea ?? 0,
        totalJobsCompleted: hStats?.totalPlots ?? 0,
      },
      expenses: expensesByType,
      labour: {
        totalCost: labourCost,
        pendingPayments: labourPending,
      },
    };
  }

  async customerLedger(customerId: string, user: AuthUser): Promise<CustomerLedger> {
    const tenant = new Types.ObjectId(user.tenantId);
    const customer = await this.customers.findOne({ _id: customerId, tenantId: tenant }).exec();
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Staff only see this customer's jobs on their assigned harvesters.
    const plots = await this.plots
      .find({
        tenantId: tenant,
        customerId: new Types.ObjectId(customerId),
        ...harvesterFilter(user),
      })
      .sort({ harvestDate: -1 })
      .exec();

    const payments = await this.payments
      .find({
        tenantId: tenant,
        partyType: PartyType.CUSTOMER,
        partyId: new Types.ObjectId(customerId),
      })
      .sort({ date: -1 })
      .exec();

    const totalBillAmount = plots.reduce((acc, p) => acc + p.harvestingAmount, 0);
    const totalHarvestedArea = plots.reduce((acc, p) => acc + p.area, 0);
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
