import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountRequestStatus } from '@wh/shared';
import { idColumn } from '../../common/columns';
import { newObjectId } from '../../common/object-id';

/**
 * A self-service request to open an OWNER account. Platform-level (not tenant
 * scoped) — the platform admin approves it from the web portal, which then
 * creates the actual owner. Stores the chosen password (hashed) so approval
 * can mint the owner without asking again.
 */
@Entity('account_requests')
export class AccountRequest {
  @PrimaryColumn(idColumn)
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  fullName!: string;

  @Index()
  @Column({ type: 'varchar', length: 160 })
  email!: string;

  @Index()
  @Column({ type: 'varchar', length: 16 })
  mobile!: string;

  /** How many harvesters the requester intends to manage (drives plan sizing). */
  @Column({ type: 'smallint', unsigned: true, default: 1 })
  harvesterCount!: number;

  /** Never selected by default so it can't leak through generic queries. */
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: AccountRequestStatus, default: AccountRequestStatus.PENDING })
  status!: AccountRequestStatus;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @BeforeInsert()
  protected ensureId(): void {
    if (!this.id) this.id = newObjectId();
  }
}
