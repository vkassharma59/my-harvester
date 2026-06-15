import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Harvester } from './harvester.schema';
import { HarvestersController } from './harvesters.controller';
import { HarvestersService } from './harvesters.service';

@Module({
  imports: [TypeOrmModule.forFeature([Harvester])],
  controllers: [HarvestersController],
  providers: [HarvestersService],
  exports: [HarvestersService],
})
export class HarvestersModule {}
