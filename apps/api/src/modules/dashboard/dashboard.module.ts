import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from '../attendance/attendance.schema';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from '../expense-categories/expense-category.schema';
import { Expense, ExpenseSchema } from '../expenses/expense.schema';
import { Labour, LabourSchema } from '../labour/labour.schema';
import { Payment, PaymentSchema } from '../payments/payment.schema';
import { Plot, PlotSchema } from '../plots/plot.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plot.name, schema: PlotSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Labour.name, schema: LabourSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: ExpenseCategory.name, schema: ExpenseCategorySchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
