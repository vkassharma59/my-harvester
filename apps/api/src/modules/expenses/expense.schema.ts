import { Column, Entity, Index } from 'typeorm';
import { ExpenseType } from '@wh/shared';
import { idColumn, idColumnNullable, money } from '../../common/columns';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('expenses')
@Index(['tenantId', 'harvesterId', 'date'])
@Index(['tenantId', 'categoryId'])
@Index(['tenantId', 'pumpId'])
@Index(['tenantId', 'labourId'])
export class Expense extends AuditedEntity {
  @Column(idColumn)
  harvesterId!: string;

  @Column({ type: 'datetime' })
  date!: Date;

  @Column({ type: 'enum', enum: ExpenseType })
  type!: ExpenseType;

  /** A custom category; null for the built-in types. */
  @Column(idColumnNullable)
  categoryId?: string | null;

  /** Set only for DIESEL expenses: the fuel pump the diesel was bought from. */
  @Column(idColumnNullable)
  pumpId?: string | null;

  /** Set only for LABOUR expenses: the labourer this payment is for. */
  @Column(idColumnNullable)
  labourId?: string | null;

  @Column(money())
  amount!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  attachmentUrl?: string | null;
}
