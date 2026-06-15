import { Column, Entity, Index } from 'typeorm';
import { idColumn } from '../../common/columns';
import { AuditedEntity } from '../../common/entities/audited.entity';

/**
 * One row per day a daily-wage worker was present. Existence = present;
 * unchecking a day deletes the row. `date` is a 'YYYY-MM-DD' calendar date.
 */
@Entity('attendance')
@Index(['labourId', 'date'], { unique: true })
@Index(['tenantId', 'labourId'])
export class Attendance extends AuditedEntity {
  @Column(idColumn)
  labourId!: string;

  @Column(idColumn)
  harvesterId!: string;

  /** Stored as a SQL DATE; TypeORM reads/writes it as a 'YYYY-MM-DD' string. */
  @Column({ type: 'date' })
  date!: string;
}
