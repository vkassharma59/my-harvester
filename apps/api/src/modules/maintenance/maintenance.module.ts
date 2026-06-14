import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Harvester,
      Customer,
      Expense,
      Labour,
      Plot,
      Payment,
      AppSettings,
      Agent,
      FuelPump,
      ExpenseCategory,
      Attendance,
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
