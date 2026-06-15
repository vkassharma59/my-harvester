import { Column, Entity } from 'typeorm';
import { Role } from '@wh/shared';
import { AuditedEntity } from '../../common/entities/audited.entity';

@Entity('admins')
export class Admin extends AuditedEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email!: string;

  /** Mobile number — a unique login identity (nullable so seeded owners may omit it). */
  @Column({ type: 'varchar', length: 16, nullable: true, unique: true })
  phone?: string | null;

  /** Never selected by default so it cannot leak through generic queries. */
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: Role, default: Role.STAFF_ADMIN })
  role!: Role;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** Harvesters a staff admin may access (empty/ignored for OWNER). Stored in
   *  the admin_harvesters join table; hydrated by LinksService (not a column). */
  harvesterIds!: string[];
}
