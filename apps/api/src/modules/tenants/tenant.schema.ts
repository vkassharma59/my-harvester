import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Plan, SubscriptionStatus } from '@wh/shared';
import { idColumn } from '../../common/columns';
import { Admin } from '../admins/admin.schema';

/**
 * One harvester business — the billing & profile record for an OWNER, keyed by
 * the owner's admin id (which is the `tenantId` on every other record). The
 * `admins` table stays auth-only; everything commercial lives here. Created on
 * onboarding and backfilled for pre-existing owners.
 */
@Entity('tenants')
export class Tenant {
  /** == the owner admin id (the tenantId used to scope all of the owner's data). */
  @PrimaryColumn(idColumn)
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  businessName!: string;

  /** Village / mandi — used for filtering and abuse clustering. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  region?: string | null;

  /** Indian State / UT the owner operates from. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  state?: string | null;

  /** District within `state`. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  district?: string | null;

  /** OTP-verified mobile — the anti-abuse identity anchor. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  verifiedPhone?: string | null;

  /** Harvester registration number; duplicates flag likely repeat free trials. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  machineNumber?: string | null;

  @Column({ type: 'enum', enum: Plan, default: Plan.FREE_TRIAL })
  plan!: Plan;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  status!: SubscriptionStatus;

  @Column({ type: 'datetime', nullable: true })
  trialStartedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  trialEndsAt?: Date | null;

  /** Paid period end (set once they convert from trial). */
  @Column({ type: 'datetime', nullable: true })
  currentPeriodEndsAt?: Date | null;

  /** Reseller / referral source, if sold through an agent. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  soldBy?: string | null;

  /** Private super-admin support notes. */
  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  /** The owner this tenant belongs to (shares its primary key). Deleting the
   *  owner removes the tenant. */
  @OneToOne(() => Admin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id' })
  owner?: Admin;
}
