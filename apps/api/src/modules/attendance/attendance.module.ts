import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Labour, LabourSchema } from '../labour/labour.schema';
import { Attendance, AttendanceSchema } from './attendance.schema';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Labour.name, schema: LabourSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
