import { Column, Entity } from 'typeorm';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('fuel_pumps')
export class FuelPump extends AuditedEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  phone?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** Harvesters this pump supplies diesel to (many-to-many). Stored in the
   *  fuel_pump_harvesters join table; hydrated by LinksService (not a column). */
  harvesterIds!: string[];
}
