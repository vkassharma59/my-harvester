import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { idColumn, idColumnNullable } from '../columns';
import { newObjectId } from '../object-id';

/**
 * Base class every domain entity extends. Provides the 24-char hex primary key
 * (generated client-side for offline creates, or here otherwise), the tenant
 * scope column, and the audit columns (created/updated by + timestamps).
 */
export abstract class AuditedEntity {
  /** 24-char hex id — mirrors a MongoDB ObjectId so clients can generate it. */
  @PrimaryColumn(idColumn)
  id!: string;

  /**
   * Owning tenant: the owner (account) id this record belongs to. Indexed
   * because every scoped query filters on it. An owner's own Admin row sets
   * tenantId to its own id; everything else inherits it.
   */
  @Index()
  @Column(idColumn)
  tenantId!: string;

  @Column(idColumnNullable)
  createdBy?: string | null;

  @Column(idColumnNullable)
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
