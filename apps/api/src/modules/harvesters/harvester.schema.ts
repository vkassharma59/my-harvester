import { Column, Entity } from 'typeorm';
import { HarvesterStatus, HarvesterType } from '@wh/shared';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('harvesters')
export class Harvester extends AuditedEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  registrationNo?: string | null;

  @Column({ type: 'varchar', length: 32, default: HarvesterStatus.ACTIVE })
  status!: HarvesterStatus;

  @Column({ type: 'varchar', length: 32, default: HarvesterType.COMBINE })
  type!: HarvesterType;

  // COMBINE: a single per-unit rate.
  @Column({ type: 'double', nullable: true })
  ratePerUnit?: number | null;

  // BHUSA: separate per-unit rates.
  @Column({ type: 'double', nullable: true })
  rateWithBhusa?: number | null;

  @Column({ type: 'double', nullable: true })
  rateWithoutBhusa?: number | null;
}
