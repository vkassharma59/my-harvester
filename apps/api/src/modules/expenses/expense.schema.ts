import { Column, Entity, Index } from 'typeorm';
import { ExpenseType } from '@wh/shared';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('expenses')
@Index(['harvesterId', 'date'])
export class Expense extends AuditedEntity {
  @Column({ type: 'varchar', length: 24 })
  harvesterId!: string;

  @Column({ type: 'datetime' })
  date!: Date;

  @Column({ type: 'varchar', length: 32 })
  type!: ExpenseType;

  /** A custom category; null for the built-in types. */
  @Column({ type: 'varchar', length: 24, nullable: true, default: null })
  categoryId?: string | null;

  /** Set only for DIESEL expenses: the fuel pump the diesel was bought from. */
  @Column({ type: 'varchar', length: 24, nullable: true, default: null })
  pumpId?: string | null;

  /** Set only for LABOUR expenses: the labourer this payment is for. */
  @Column({ type: 'varchar', length: 24, nullable: true, default: null })
  labourId?: string | null;

  @Column({ type: 'double' })
  amount!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  attachmentUrl?: string | null;
}
