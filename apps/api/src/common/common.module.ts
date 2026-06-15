import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Harvester } from '../modules/harvesters/harvester.schema';
import { HarvesterScopeService } from './harvester-scope.service';

/**
 * Global helpers shared across feature modules. Provides HarvesterScopeService
 * so any service can restrict reads to active+allowed harvesters without
 * re-registering the Harvester repository.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Harvester])],
  providers: [HarvesterScopeService],
  exports: [HarvesterScopeService],
})
export class CommonModule {}
