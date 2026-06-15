import { Column, Entity, Index } from 'typeorm';
import { AreaUnit, HarvestType } from '@wh/shared';
import { AuditedEntity } from '../../common/entities/audited.entity';

/** A harvesting job on a plot of land, carrying its commercial terms. */
@Entity('plots')
@Index(['customerId', 'harvestDate'])
@Index(['harvesterId', 'harvestDate'])
export class Plot extends AuditedEntity {
  @Column({ type: 'varchar', length: 24 })
  customerId!: string;

  @Column({ type: 'varchar', length: 24 })
  harvesterId!: string;

  @Column({ type: 'varchar', length: 255 })
  plotName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  village?: string | null;

  @Column({ type: 'double' })
  area!: number;

  @Column({ type: 'varchar', length: 32, default: AreaUnit.BIGHA })
  areaUnit!: AreaUnit;

  @Column({ type: 'datetime' })
  harvestDate!: Date;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @Column({ type: 'varchar', length: 32 })
  harvestType!: HarvestType;

  // Harvesting charge to the landowner (both types)
  @Column({ type: 'double' })
  ratePerBigha!: number;

  @Column({ type: 'double' })
  harvestingAmount!: number;

  // Type 2 only: Bhusa sold to a separate buyer
  @Column({ type: 'varchar', length: 24, nullable: true, default: null })
  bhusaBuyerId?: string | null;

  @Column({ type: 'double', default: 0 })
  bhusaAmount?: number;

  // One or more Bhusa buyers, each owing their own amount (Type 2).
  @Column({
    type: 'json',
    nullable: true,
    transformer: {
      to: (v: { customerId: string; amount: number }[]) => v ?? [],
      from: (v: { customerId: string; amount: number }[]) => v ?? [],
    },
  })
  bhusaBuyers?: { customerId: string; amount: number }[];

  @Column({ type: 'double' })
  totalAmount!: number;

  // Optional commission agent for this job.
  @Column({ type: 'varchar', length: 24, nullable: true, default: null })
  agentId?: string | null;

  @Column({ type: 'double', default: 0 })
  commissionAmount?: number;
}
