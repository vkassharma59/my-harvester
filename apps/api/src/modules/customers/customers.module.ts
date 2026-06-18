import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payments/payment.schema';
import { Plot } from '../plots/plot.schema';
import { Customer } from './customer.schema';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Plot, Payment])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
