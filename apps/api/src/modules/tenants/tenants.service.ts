import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod, Plan, Role, SubscriptionStatus } from '@wh/shared';
import { AppConfig } from '../../config/configuration';
import { Admin } from '../admins/admin.schema';
import { SubscriptionPayment } from './subscription-payment.schema';
import { Tenant } from './tenant.schema';

/** Options when provisioning a tenant for an owner (from onboarding or backfill). */
export interface CreateTenantOptions {
  businessName?: string;
  region?: string | null;
  state?: string | null;
  district?: string | null;
  verifiedPhone?: string | null;
  machineNumber?: string | null;
  soldBy?: string | null;
  /** Backfill of a pre-existing owner: date the trial from their signup, not today. */
  backfill?: boolean;
}

/** Add `n` days to a date without mutating the original. */
export function addDays(from: Date, n: number): Date {
  const r = new Date(from);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Add `n` calendar months to a date without mutating the original. Clamps to
 * the last day of the target month so e.g. Jan 31 + 1 month → Feb 28/29.
 */
export function addMonths(from: Date, n: number): Date {
  const r = new Date(from);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  const lastDayOfMonth = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, lastDayOfMonth));
  return r;
}

/** The date a tenant's access actually runs out (paid period wins over trial). */
export function effectivePeriodEnd(t: Pick<Tenant, 'currentPeriodEndsAt' | 'trialEndsAt'>): Date | null {
  const end = t.currentPeriodEndsAt ?? t.trialEndsAt ?? null;
  return end ? new Date(end) : null;
}

/**
 * Derive the status implied purely by the dates (ignores SUSPENDED, which is a
 * manual override). Paid + future period ⇒ ACTIVE; trial + future ⇒ TRIAL;
 * otherwise EXPIRED. Used by reactivation and the expiry guard.
 */
export function deriveStatus(t: Pick<Tenant, 'plan' | 'currentPeriodEndsAt' | 'trialEndsAt'>): SubscriptionStatus {
  const end = effectivePeriodEnd(t);
  if (!end || end.getTime() < Date.now()) return SubscriptionStatus.EXPIRED;
  return t.plan === Plan.PAID ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIAL;
}

@Injectable()
export class TenantsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    @InjectRepository(SubscriptionPayment) private readonly payments: Repository<SubscriptionPayment>,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Runs after every module's onModuleInit (so the bootstrap-seeded owner
   * already exists): give every OWNER a tenant row if it doesn't have one yet.
   */
  async onApplicationBootstrap(): Promise<void> {
    const owners = await this.admins.find({ where: { role: Role.OWNER } });
    if (!owners.length) return;

    const existing = await this.tenants.find({ select: { id: true } });
    const have = new Set(existing.map((t) => t.id));
    const missing = owners.filter((o) => !have.has(o.id));
    if (!missing.length) return;

    for (const owner of missing) {
      await this.createForOwner(owner, { backfill: true });
    }
    this.logger.log(`Backfilled ${missing.length} tenant(s) for existing owners`);
  }

  private get trialDays(): number {
    return this.config.get('subscription', { infer: true }).trialDays;
  }

  /** Provision a fresh free-trial tenant for an owner. */
  async createForOwner(owner: Admin, opts: CreateTenantOptions = {}): Promise<Tenant> {
    // Backfill dates the trial from the owner's signup so long-standing owners
    // don't silently get a brand-new free year; new onboards start today.
    const start = opts.backfill && owner.createdAt ? new Date(owner.createdAt) : new Date();
    const end = addDays(start, this.trialDays);
    const expired = end.getTime() < Date.now();

    const tenant = this.tenants.create({
      id: owner.id,
      businessName: opts.businessName?.trim() || owner.name,
      region: opts.region ?? null,
      state: opts.state ?? null,
      district: opts.district ?? null,
      verifiedPhone: opts.verifiedPhone ?? owner.phone ?? null,
      machineNumber: opts.machineNumber ?? null,
      soldBy: opts.soldBy ?? null,
      plan: Plan.FREE_TRIAL,
      status: expired ? SubscriptionStatus.EXPIRED : SubscriptionStatus.TRIAL,
      trialStartedAt: start,
      trialEndsAt: end,
    });
    return this.tenants.save(tenant);
  }

  findById(id: string): Promise<Tenant | null> {
    return this.tenants.findOne({ where: { id } });
  }

  private async getOrThrow(id: string): Promise<Tenant> {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Owner not found');
    return tenant;
  }

  /** Update business-profile fields (not subscription state). */
  async updateProfile(
    id: string,
    patch: Partial<
      Pick<
        Tenant,
        | 'businessName'
        | 'region'
        | 'state'
        | 'district'
        | 'verifiedPhone'
        | 'machineNumber'
        | 'soldBy'
        | 'notes'
      >
    >,
  ): Promise<Tenant> {
    const tenant = await this.getOrThrow(id);
    Object.assign(tenant, patch);
    return this.tenants.save(tenant);
  }

  /**
   * Extend the free trial. Adds months onto the later of (now, current trial
   * end) so an active trial is lengthened and a lapsed one is reopened. Also
   * lifts a manual suspension, since extending is an explicit reactivation.
   */
  async extendTrial(id: string, months: number): Promise<Tenant> {
    const tenant = await this.getOrThrow(id);
    const current = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
    const base = current && current.getTime() > Date.now() ? current : new Date();
    tenant.trialEndsAt = addMonths(base, months);
    if (!tenant.trialStartedAt) tenant.trialStartedAt = new Date();
    tenant.plan = Plan.FREE_TRIAL;
    tenant.status = deriveStatus(tenant);
    return this.tenants.save(tenant);
  }

  /** Record a manual cash/UPI payment and extend the paid period accordingly. */
  async recordPayment(
    id: string,
    input: { amount: number; method: PaymentMethod; paidAt?: string; periodMonths?: number },
    recordedBy: string,
  ): Promise<{ tenant: Tenant; payment: SubscriptionPayment }> {
    const tenant = await this.getOrThrow(id);
    const periodMonths = input.periodMonths ?? 12;
    // Stack onto an existing future paid period, otherwise start today.
    const currentEnd = tenant.currentPeriodEndsAt ? new Date(tenant.currentPeriodEndsAt) : null;
    const periodStart = currentEnd && currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    const periodEnd = addMonths(periodStart, periodMonths);

    const payment = await this.payments.save(
      this.payments.create({
        tenantId: id,
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        periodStart,
        periodEnd,
        recordedBy,
      }),
    );

    tenant.plan = Plan.PAID;
    tenant.currentPeriodEndsAt = periodEnd;
    tenant.status = SubscriptionStatus.ACTIVE;
    const saved = await this.tenants.save(tenant);
    return { tenant: saved, payment };
  }

  /** Manually set the plan (record correction); status is recomputed from dates. */
  async changePlan(id: string, plan: Plan): Promise<Tenant> {
    const tenant = await this.getOrThrow(id);
    tenant.plan = plan;
    tenant.status = deriveStatus(tenant);
    return this.tenants.save(tenant);
  }

  /** Manually disable a tenant (e.g. abuse) — blocks writes until reactivated. */
  async suspend(id: string): Promise<Tenant> {
    const tenant = await this.getOrThrow(id);
    tenant.status = SubscriptionStatus.SUSPENDED;
    return this.tenants.save(tenant);
  }

  /** Lift a suspension; status returns to whatever the dates imply. */
  async reactivate(id: string): Promise<Tenant> {
    const tenant = await this.getOrThrow(id);
    tenant.status = deriveStatus(tenant);
    return this.tenants.save(tenant);
  }
}
