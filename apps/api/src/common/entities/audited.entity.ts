import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { newObjectId } from '../object-id';

/**
 * Base class every domain entity extends. Provides the 24-char hex primary key
 * (generated client-side for offline creates, or here otherwise), the tenant
 * scope column, and the audit columns (created/updated by + timestamps).
 */
export abstract class AuditedEntity {
  /** 24-char hex id — mirrors a MongoDB ObjectId so clients can generate it. */
  @PrimaryColumn({ type: 'varchar', length: 24 })
  id!: string;

  /**
   * Owning tenant: the owner (account) id this record belongs to. Indexed
   * because every scoped query filters on it. An owner's own Admin row sets
   * tenantId to its own id; everything else inherits it.
   */
  @Index()
  @Column({ type: 'varchar', length: 24 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 24, nullable: true, default: null })
  createdBy?: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true, default: null })
  updatedBy?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @BeforeInsert()
  protected ensureId(): void {
    if (!this.id) this.id = newObjectId();
  }
}
