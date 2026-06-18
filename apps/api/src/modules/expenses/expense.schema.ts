import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ExpenseType } from '@wh/shared';
import { idColumn, idColumnNullable, money } from '../../common/columns';
import { AuditedEntity } from '../../common/entities/audited.entity';
import { ExpenseCategory } from '../expense-categories/expense-category.schema';
import { FuelPump } from '../fuel-pumps/fuel-pump.schema';
import { Harvester } from '../harvesters/harvester.schema';
import { Labour } from '../labour/labour.schema';

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

  // --- Foreign keys (the id columns above are the FK columns) ---
  @ManyToOne(() => Harvester, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'harvesterId' })
  harvester?: Harvester;

  @ManyToOne(() => ExpenseCategory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: ExpenseCategory | null;

  @ManyToOne(() => FuelPump, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pumpId' })
  pump?: FuelPump | null;

  @ManyToOne(() => Labour, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'labourId' })
  labour?: Labour | null;
}
