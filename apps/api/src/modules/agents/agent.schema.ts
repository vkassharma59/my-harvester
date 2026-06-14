import { Column, Entity } from 'typeorm';
import { AuditedEntity } from '../../common/entities/audited.entity';

/** A commission agent attached to a single harvester. */
@Entity('agents')
export class Agent extends AuditedEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 24 })
  harvesterId!: string;

  /** Commission amount per unit of area (e.g. 200 per bigha/acre). */
  @Column({ type: 'double' })
  commissionRate!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
