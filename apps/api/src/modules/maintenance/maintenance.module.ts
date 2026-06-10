import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import { Expense, ExpenseSchema } from '../expenses/expense.schema';
import { Harvester, HarvesterSchema } from '../harvesters/harvester.schema';
import { Labour, LabourSchema } from '../labour/labour.schema';
import { Payment, PaymentSchema } from '../payments/payment.schema';
import { Plot, PlotSchema } from '../plots/plot.schema';
import { AppSettings, AppSettingsSchema } from '../settings/settings.schema';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Harvester.name, schema: HarvesterSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Labour.name, schema: LabourSchema },
      { name: Plot.name, schema: PlotSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: AppSettings.name, schema: AppSettingsSchema },
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
