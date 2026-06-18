import { Column, Entity } from 'typeorm';
import { AreaUnit } from '@wh/shared';
import { AuditedEntity } from '../../common/entities/audited.entity';

/** A single row holds the app-wide configurable defaults (per tenant). */
@Entity('app_settings')
export class AppSettings extends AuditedEntity {
  @Column({ type: 'varchar', length: 8, default: 'INR' })
  currency!: string;

  @Column({ type: 'enum', enum: AreaUnit, default: AreaUnit.BIGHA })
  defaultAreaUnit!: AreaUnit;

  /** Business/firm name shown in payment reminders. */
  @Column({ type: 'varchar', length: 120, default: '' })
  firmName!: string;

  /** Owner's UPI ID (VPA) for collecting payments via QR / link. */
  @Column({ type: 'varchar', length: 120, default: '' })
  upiId!: string;
}
