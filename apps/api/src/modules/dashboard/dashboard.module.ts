import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../attendance/attendance.schema';
import { Customer } from '../customers/customer.schema';
import { ExpenseCategory } from '../expense-categories/expense-category.schema';
import { Expense } from '../expenses/expense.schema';
import { Labour } from '../labour/labour.schema';
import { Payment } from '../payments/payment.schema';
import { Plot } from '../plots/plot.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plot, Expense, Labour, Payment, Customer, ExpenseCategory, Attendance]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
