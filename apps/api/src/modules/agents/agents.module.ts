import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payments/payment.schema';
import { Plot } from '../plots/plot.schema';
import { Agent } from './agent.schema';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, Plot, Payment])],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
