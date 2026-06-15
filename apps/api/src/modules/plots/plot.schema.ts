import { Column, Entity, Index } from 'typeorm';
import { AreaUnit, HarvestType } from '@wh/shared';
import { idColumn, idColumnNullable, money } from '../../common/columns';
import { AuditedEntity } from '../../common/entities/audited.entity';

/** A harvesting job on a plot of land, carrying its commercial terms. */
@Entity('plots')
@Index(['tenantId', 'harvesterId', 'harvestDate'])
@Index(['tenantId', 'customerId', 'harvestDate'])
@Index(['tenantId', 'agentId'])
export class Plot extends AuditedEntity {
  @Column(idColumn)
  customerId!: string;

  @Column(idColumn)
  harvesterId!: string;

  @Column({ type: 'varchar', length: 120 })
  plotName!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  village?: string | null;

  @Column(money())
  area!: number;

  @Column({ type: 'enum', enum: AreaUnit, default: AreaUnit.BIGHA })
  areaUnit!: AreaUnit;

  @Column({ type: 'datetime' })
  harvestDate!: Date;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @Column({ type: 'enum', enum: HarvestType })
  harvestType!: HarvestType;

  // Harvesting charge to the landowner (both types)
  @Column(money())
  ratePerBigha!: number;

  @Column(money())
  harvestingAmount!: number;

  // Type 2 only: Bhusa sold to a separate buyer
  @Column(idColumnNullable)
  bhusaBuyerId?: string | null;

  @Column(money({ default: 0 }))
  bhusaAmount?: number;

  // One or more Bhusa buyers, each owing their own amount (Type 2).
  // (Phase 2 of the DB redesign moves this to a plot_bhusa_buyers join table.)
  @Column({
    type: 'json',
    nullable: true,
    transformer: {
      to: (v: { customerId: string; amount: number }[]) => v ?? [],
      from: (v: { customerId: string; amount: number }[]) => v ?? [],
    },
  })
  bhusaBuyers?: { customerId: string; amount: number }[];

  @Column(money())
  totalAmount!: number;

  // Optional commission agent for this job.
  @Column(idColumnNullable)
  agentId?: string | null;

  @Column(money({ default: 0 }))
  commissionAmount?: number;
}
