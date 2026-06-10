import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Labour, LabourSchema } from './labour.schema';
import { LabourController } from './labour.controller';
import { LabourService } from './labour.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Labour.name, schema: LabourSchema }])],
  controllers: [LabourController],
  providers: [LabourService],
  exports: [LabourService],
})
export class LabourModule {}
