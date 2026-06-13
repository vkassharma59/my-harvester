import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from '../expenses/expense.schema';
import { Payment, PaymentSchema } from '../payments/payment.schema';
import { FuelPump, FuelPumpSchema } from './fuel-pump.schema';
import { FuelPumpsController } from './fuel-pumps.controller';
import { FuelPumpsService } from './fuel-pumps.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FuelPump.name, schema: FuelPumpSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [FuelPumpsController],
  providers: [FuelPumpsService],
  exports: [FuelPumpsService],
})
export class FuelPumpsModule {}
