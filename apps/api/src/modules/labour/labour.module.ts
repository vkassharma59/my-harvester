import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from '../attendance/attendance.schema';
import { Payment, PaymentSchema } from '../payments/payment.schema';
import { Labour, LabourSchema } from './labour.schema';
import { LabourController } from './labour.controller';
import { LabourService } from './labour.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Labour.name, schema: LabourSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
  ],
  controllers: [LabourController],
  providers: [LabourService],
  exports: [LabourService],
})
export class LabourModule {}
