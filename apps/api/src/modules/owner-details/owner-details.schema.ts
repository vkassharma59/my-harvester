import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { idColumn } from '../../common/columns';
import { Admin } from '../admins/admin.schema';

/**
 * Extra owner/admin profile attributes, kept apart from the auth (`admins`) and
 * billing (`tenants`) tables so we can grow owner details — state, district and
 * more later — without touching those core records. Keyed by the owner's admin
 * id (1:1), created on onboarding / approval.
 */
@Entity('owner_details')
export class OwnerDetails {
  /** == the owner admin id (the tenantId used to scope all of the owner's data). */
  @PrimaryColumn(idColumn)
  id!: string;

  /** Indian State / UT the owner operates from. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  state?: string | null;

  /** District within `state`. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  district?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  /** The owner these details belong to (shares its primary key). Deleting the
   *  owner removes this row. */
  @OneToOne(() => Admin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id' })
  owner?: Admin;
}
