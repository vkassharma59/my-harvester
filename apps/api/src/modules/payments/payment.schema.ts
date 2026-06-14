import { Column, Entity, Index } from 'typeorm';
import { PartyType } from '@wh/shared';
import { AuditedEntity } from '../../common/entities/audited.entity';

/**
 * A money movement. `partyType` says whose ledger it belongs to; `partyId`
 * points at the customer / bhusa-buyer / labour accordingly. This single
 * table lets the customer ledger and labour payment reports be rebuilt.
 */
@Entity('payments')
@Index(['partyType', 'partyId', 'date'])
export class Payment extends AuditedEntity {
  @Column({ type: 'varchar', length: 32 })
  partyType!: PartyType;

  @Column({ type: 'varchar', length: 24 })
  partyId!: string;

  @Column({ type: 'varchar', length: 24, nullable: true, default: null })
  plotId?: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true, default: null })
  harvesterId?: string | null;

  @Column({ type: 'datetime' })
  date!: Date;

  @Column({ type: 'double' })
  amount!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  /** Optional receipt / proof file URL. */
  @Column({ type: 'varchar', length: 1024, nullable: true })
  attachmentUrl?: string | null;
}
