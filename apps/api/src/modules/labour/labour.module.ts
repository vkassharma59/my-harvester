import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from '../payments/payment.schema';
import { Labour, LabourSchema } from './labour.schema';
import { LabourController } from './labour.controller';
import { LabourService } from './labour.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Labour.name, schema: LabourSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [LabourController],
  providers: [LabourService],
  exports: [LabourService],
})
export class LabourModule {}
