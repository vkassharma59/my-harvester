import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Agent, AgentDocument } from '../agents/agent.schema';
import { Attendance, AttendanceDocument } from '../attendance/attendance.schema';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from '../expense-categories/expense-category.schema';
import { Expense, ExpenseDocument } from '../expenses/expense.schema';
import { FuelPump, FuelPumpDocument } from '../fuel-pumps/fuel-pump.schema';
import { Harvester, HarvesterDocument } from '../harvesters/harvester.schema';
import { Labour, LabourDocument } from '../labour/labour.schema';
import { Payment, PaymentDocument } from '../payments/payment.schema';
import { Plot, PlotDocument } from '../plots/plot.schema';
import { AppSettings, AppSettingsDocument } from '../settings/settings.schema';

export interface ClearDataResult {
  deleted: Record<string, number>;
}

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(Harvester.name) private readonly harvesters: Model<HarvesterDocument>,
    @InjectModel(Customer.name) private readonly customers: Model<CustomerDocument>,
    @InjectModel(Expense.name) private readonly expenses: Model<ExpenseDocument>,
    @InjectModel(Labour.name) private readonly labour: Model<LabourDocument>,
    @InjectModel(Plot.name) private readonly plots: Model<PlotDocument>,
    @InjectModel(Payment.name) private readonly payments: Model<PaymentDocument>,
    @InjectModel(AppSettings.name) private readonly settings: Model<AppSettingsDocument>,
    @InjectModel(Agent.name) private readonly agents: Model<AgentDocument>,
    @InjectModel(FuelPump.name) private readonly fuelPumps: Model<FuelPumpDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly expenseCategories: Model<ExpenseCategoryDocument>,
    @InjectModel(Attendance.name) private readonly attendance: Model<AttendanceDocument>,
  ) {}

  /**
   * Wipes all business data for one tenant. Admin accounts are intentionally
   * preserved — only operational records are removed.
   */
  async clearTenantData(tenantId: string): Promise<ClearDataResult> {
    const filter = { tenantId: new Types.ObjectId(tenantId) };
    const targets: [string, Model<any>][] = [
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
    for (const [name, model] of targets) {
      const res = await model.deleteMany(filter).exec();
      deleted[name] = res.deletedCount ?? 0;
    }
    return { deleted };
  }
}
