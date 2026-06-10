import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Harvester, HarvesterSchema } from '../harvesters/harvester.schema';
import { Plot, PlotSchema } from './plot.schema';
import { PlotsController } from './plots.controller';
import { PlotsService } from './plots.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plot.name, schema: PlotSchema },
      { name: Harvester.name, schema: HarvesterSchema },
    ]),
  ],
  controllers: [PlotsController],
  providers: [PlotsService],
  exports: [PlotsService],
})
export class PlotsModule {}
