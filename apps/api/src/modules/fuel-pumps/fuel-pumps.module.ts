import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../expenses/expense.schema';
import { Payment } from '../payments/payment.schema';
import { FuelPump } from './fuel-pump.schema';
import { FuelPumpsController } from './fuel-pumps.controller';
import { FuelPumpsService } from './fuel-pumps.service';

@Module({
  imports: [TypeOrmModule.forFeature([FuelPump, Expense, Payment])],
  controllers: [FuelPumpsController],
  providers: [FuelPumpsService],
  exports: [FuelPumpsService],
})
export class FuelPumpsModule {}
