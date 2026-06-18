import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { PaymentMethod } from '@wh/shared';
import { idColumn, idColumnNullable, money } from '../../common/columns';
import { newObjectId } from '../../common/object-id';
import { Tenant } from './tenant.schema';

/**
 * A manually-recorded subscription payment (cash / UPI), captured by the super
 * admin. India billing is offline, so there is no card gateway: recording a
 * payment here is what extends the tenant's paid period.
 */
@Entity('subscription_payments')
@Index(['tenantId', 'paidAt'])
export class SubscriptionPayment {
  @PrimaryColumn(idColumn)
  id!: string;

  @Column(idColumn)
  tenantId!: string;

  @Column(money())
  amount!: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  method!: PaymentMethod;

  @Column({ type: 'datetime' })
  paidAt!: Date;

  @Column({ type: 'datetime' })
  periodStart!: Date;

  @Column({ type: 'datetime' })
  periodEnd!: Date;

  /** The super admin who recorded this payment. */
  @Column(idColumnNullable)
  recordedBy?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  @BeforeInsert()
  protected ensureId(): void {
    if (!this.id) this.id = newObjectId();
  }
}
