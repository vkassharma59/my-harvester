import { Column, Entity, Index } from 'typeorm';
import { BugStatus } from '@wh/shared';
import { AuditedEntity } from '../../common/entities/audited.entity';

/** A bug reported from the mobile app. tenantId/createdBy identify who filed it. */
@Entity('bug_reports')
@Index(['status', 'createdAt'])
export class BugReport extends AuditedEntity {
  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  /** Optional screenshot URL (uploaded via /uploads). */
  @Column({ type: 'varchar', length: 512, nullable: true })
  screenshotUrl?: string | null;

  @Column({ type: 'enum', enum: BugStatus, default: BugStatus.OPEN })
  status!: BugStatus;
}
