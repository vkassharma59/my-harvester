import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { idColumn } from '../../common/columns';
import { Harvester } from '../harvesters/harvester.schema';
import { FuelPump } from './fuel-pump.schema';

/** Join table: which harvesters a fuel pump supplies diesel to (many-to-many). */
@Entity('fuel_pump_harvesters')
@Index(['harvesterId'])
export class FuelPumpHarvester {
  @PrimaryColumn(idColumn)
  pumpId!: string;

  @PrimaryColumn(idColumn)
  harvesterId!: string;

  @ManyToOne(() => FuelPump, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pumpId' })
  pump?: FuelPump;

  @ManyToOne(() => Harvester, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'harvesterId' })
  harvester?: Harvester;
}
