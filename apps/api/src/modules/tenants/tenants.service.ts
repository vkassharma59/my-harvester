import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, Role, SubscriptionStatus } from '@wh/shared';
import { AppConfig } from '../../config/configuration';
import { Admin } from '../admins/admin.schema';
import { Tenant } from './tenant.schema';

/** Options when provisioning a tenant for an owner (from onboarding or backfill). */
export interface CreateTenantOptions {
  businessName?: string;
  region?: string | null;
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

@Injectable()
export class TenantsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
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
}
