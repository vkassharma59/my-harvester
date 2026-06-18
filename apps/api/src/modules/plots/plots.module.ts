import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../agents/agent.schema';
import { Harvester } from '../harvesters/harvester.schema';
import { Plot } from './plot.schema';
import { PlotsController } from './plots.controller';
import { PlotsService } from './plots.service';

@Module({
  imports: [TypeOrmModule.forFeature([Plot, Harvester, Agent])],
  controllers: [PlotsController],
  providers: [PlotsService],
  exports: [PlotsService],
})
export class PlotsModule {}
