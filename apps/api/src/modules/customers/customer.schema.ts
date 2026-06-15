import { Column, Entity, Index } from 'typeorm';
import { AuditedEntity } from '../../common/entities/audited.entity';

// Mobile number is a unique identity per tenant (enforced at the DB level).
// The composite (tenantId, phone) index also serves tenant-scoped lookups.
@Entity('customers')
@Index(['tenantId', 'phone'], { unique: true })
export class Customer extends AuditedEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  phone!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  village?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  /** Source contact id from the device's contact list, if imported. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  deviceContactId?: string | null;
}
