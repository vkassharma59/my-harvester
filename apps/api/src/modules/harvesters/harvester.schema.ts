import { Column, Entity, Index } from 'typeorm';
import { HarvesterStatus, HarvesterType } from '@wh/shared';
import { money } from '../../common/columns';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('harvesters')
@Index(['tenantId', 'status'])
export class Harvester extends AuditedEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  registrationNo?: string | null;

  @Column({ type: 'enum', enum: HarvesterStatus, default: HarvesterStatus.ACTIVE })
  status!: HarvesterStatus;

  @Column({ type: 'enum', enum: HarvesterType, default: HarvesterType.COMBINE })
  type!: HarvesterType;

  // COMBINE: a single per-unit rate.
  @Column(money({ nullable: true }))
  ratePerUnit?: number | null;

  // BHUSA: separate per-unit rates.
  @Column(money({ nullable: true }))
  rateWithBhusa?: number | null;

  @Column(money({ nullable: true }))
  rateWithoutBhusa?: number | null;
}
