import { Column, Entity } from 'typeorm';
import { LabourType, PaymentStatus, WageType } from '@wh/shared';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('labour')
export class Labour extends AuditedEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  mobile!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: LabourType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customType?: string | null;

  @Column({ type: 'varchar', length: 24 })
  harvesterId!: string;

  @Column({ type: 'varchar', length: 32, default: WageType.DAILY })
  wageType!: WageType;

  @Column({ type: 'double', nullable: true })
  dailyWage?: number | null;

  @Column({ type: 'double', nullable: true })
  customAmount?: number | null;

  @Column({ type: 'varchar', length: 32, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;
}
