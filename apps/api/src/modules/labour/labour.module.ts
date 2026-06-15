import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../attendance/attendance.schema';
import { Payment } from '../payments/payment.schema';
import { Labour } from './labour.schema';
import { LabourController } from './labour.controller';
import { LabourService } from './labour.service';

@Module({
  imports: [TypeOrmModule.forFeature([Labour, Payment, Attendance])],
  controllers: [LabourController],
  providers: [LabourService],
  exports: [LabourService],
})
export class LabourModule {}
