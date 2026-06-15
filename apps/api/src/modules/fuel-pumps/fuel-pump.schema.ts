import { Column, Entity } from 'typeorm';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('fuel_pumps')
export class FuelPump extends AuditedEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  /** Harvesters this pump supplies diesel to (many-to-many, stored as JSON). */
  @Column({
    type: 'json',
    nullable: true,
    transformer: { to: (v: string[]) => v ?? [], from: (v: string[]) => v ?? [] },
  })
  harvesterIds!: string[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
