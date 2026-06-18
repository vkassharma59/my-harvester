import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { LabourType, PaymentStatus, WageType } from '@wh/shared';
import { idColumn, money } from '../../common/columns';
import { AuditedEntity } from '../../common/entities/audited.entity';
import { Harvester } from '../harvesters/harvester.schema';

@Entity('labour')
@Index(['tenantId', 'harvesterId'])
export class Labour extends AuditedEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  mobile!: string;

  @Column({ type: 'enum', enum: LabourType })
  type!: LabourType;

  @Column({ type: 'varchar', length: 80, nullable: true })
  customType?: string | null;

  @Column(idColumn)
  harvesterId!: string;

  @Column({ type: 'enum', enum: WageType, default: WageType.DAILY })
  wageType!: WageType;

  @Column(money({ nullable: true }))
  dailyWage?: number | null;

  @Column(money({ nullable: true }))
  customAmount?: number | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;

  @ManyToOne(() => Harvester, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'harvesterId' })
  harvester?: Harvester;
}
