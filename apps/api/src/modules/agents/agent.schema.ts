import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { money, idColumn } from '../../common/columns';
import { AuditedEntity } from '../../common/entities/audited.entity';
import { Harvester } from '../harvesters/harvester.schema';

/** A commission agent attached to a single harvester. */
@Entity('agents')
@Index(['tenantId', 'harvesterId'])
export class Agent extends AuditedEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  phone?: string | null;

  @Column(idColumn)
  harvesterId!: string;

  /** Commission amount per unit of area (e.g. 200 per bigha/acre). */
  @Column(money())
  commissionRate!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => Harvester, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'harvesterId' })
  harvester?: Harvester;
}
