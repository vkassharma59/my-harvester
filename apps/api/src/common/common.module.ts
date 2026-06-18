import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminHarvester } from '../modules/admins/admin-harvester.schema';
import { FuelPumpHarvester } from '../modules/fuel-pumps/fuel-pump-harvester.schema';
import { Harvester } from '../modules/harvesters/harvester.schema';
import { PlotBhusaBuyer } from '../modules/plots/plot-bhusa-buyer.schema';
import { HarvesterScopeService } from './harvester-scope.service';
import { LinksService } from './links.service';

/**
 * Global helpers shared across feature modules: HarvesterScopeService (restrict
 * reads to active+allowed harvesters) and LinksService (manage the normalized
 * join tables + hydrate the flat arrays back onto entities).
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Harvester, AdminHarvester, FuelPumpHarvester, PlotBhusaBuyer])],
  providers: [HarvesterScopeService, LinksService],
  exports: [HarvesterScopeService, LinksService],
})
export class CommonModule {}
