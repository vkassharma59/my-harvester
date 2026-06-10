import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Harvester, HarvesterSchema } from './harvester.schema';
import { HarvestersController } from './harvesters.controller';
import { HarvestersService } from './harvesters.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Harvester.name, schema: HarvesterSchema }])],
  controllers: [HarvestersController],
  providers: [HarvestersService],
  exports: [HarvestersService],
})
export class HarvestersModule {}
