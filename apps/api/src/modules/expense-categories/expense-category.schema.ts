import { Column, Entity } from 'typeorm';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('expense_categories')
export class ExpenseCategory extends AuditedEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
