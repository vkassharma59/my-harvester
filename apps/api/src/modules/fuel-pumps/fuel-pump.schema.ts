import { Column, Entity } from 'typeorm';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('fuel_pumps')
export class FuelPump extends AuditedEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  phone?: string | null;

  /** Harvesters this pump supplies diesel to (many-to-many, stored as JSON).
   *  (Phase 2 of the DB redesign moves this to a fuel_pump_harvesters table.) */
  @Column({
    type: 'json',
    nullable: true,
    transformer: { to: (v: string[]) => v ?? [], from: (v: string[]) => v ?? [] },
  })
  harvesterIds!: string[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
