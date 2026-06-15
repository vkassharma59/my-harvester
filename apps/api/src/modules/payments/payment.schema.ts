import { Column, Entity, Index } from 'typeorm';
import { PartyType } from '@wh/shared';
import { idColumn, idColumnNullable, money } from '../../common/columns';
import { AuditedEntity } from '../../common/entities/audited.entity';

/**
 * A money movement. `partyType` says whose ledger it belongs to; `partyId`
 * points at the customer / bhusa-buyer / labour / agent / pump accordingly.
 * `partyId` is polymorphic (it references different tables per `partyType`), so
 * it intentionally has no foreign key.
 */
@Entity('payments')
@Index(['tenantId', 'partyType', 'partyId', 'date'])
@Index(['tenantId', 'harvesterId'])
export class Payment extends AuditedEntity {
  @Column({ type: 'enum', enum: PartyType })
  partyType!: PartyType;

  @Column(idColumn)
  partyId!: string;

  @Column(idColumnNullable)
  plotId?: string | null;

  @Column(idColumnNullable)
  harvesterId?: string | null;

  @Column({ type: 'datetime' })
  date!: Date;

  @Column(money())
  amount!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  /** Optional receipt / proof file URL. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  attachmentUrl?: string | null;
}
