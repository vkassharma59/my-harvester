import { Column, Entity, Index } from 'typeorm';
import { AuditedEntity } from '../../common/entities/audited.entity';

/**
 * One row per day a daily-wage worker was present. Existence = present;
 * unchecking a day deletes the row. `date` is a tz-safe 'YYYY-MM-DD' string.
 */
@Entity('attendance')
@Index(['labourId', 'date'], { unique: true })
export class Attendance extends AuditedEntity {
  @Column({ type: 'varchar', length: 24 })
  labourId!: string;

  @Column({ type: 'varchar', length: 24 })
  harvesterId!: string;

  @Column({ type: 'varchar', length: 10 })
  date!: string;
}
