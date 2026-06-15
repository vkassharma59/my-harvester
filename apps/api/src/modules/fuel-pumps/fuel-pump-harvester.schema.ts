import { Entity, Index, PrimaryColumn } from 'typeorm';
import { idColumn } from '../../common/columns';

/** Join table: which harvesters a fuel pump supplies diesel to (many-to-many). */
@Entity('fuel_pump_harvesters')
@Index(['harvesterId'])
export class FuelPumpHarvester {
  @PrimaryColumn(idColumn)
  pumpId!: string;

  @PrimaryColumn(idColumn)
  harvesterId!: string;
}
