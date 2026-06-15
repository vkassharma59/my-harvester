import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AccountRequestStatus,
  Admin as AdminDto,
  AdminOverview,
  HarvesterStatus,
  OnboardOwnerResult,
  OwnerDetail,
  OwnerListItem,
  Paginated,
  Role,
  SubscriptionPayment as SubscriptionPaymentDto,
  SubscriptionStatus,
  TenantUsage,
} from '@wh/shared';
import { MailService } from '../../common/mail/mail.service';
import { generatePassword } from '../../common/password';
import { AccountRequest } from '../account-requests/account-request.schema';
import { Admin } from '../admins/admin.schema';
import { AdminsService } from '../admins/admins.service';
import { Customer } from '../customers/customer.schema';
import { Expense } from '../expenses/expense.schema';
import { Harvester } from '../harvesters/harvester.schema';
import { Payment } from '../payments/payment.schema';
import { Plot } from '../plots/plot.schema';
import { SubscriptionPayment } from '../tenants/subscription-payment.schema';
import { Tenant } from '../tenants/tenant.schema';
import { TenantsService } from '../tenants/tenants.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { OwnersQueryDto } from './dto/owners-query.dto';
import { ChangePlanDto, RecordPaymentDto } from './dto/subscription.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';

const DAY_MS = 86_400_000;
const DORMANT_AFTER_DAYS = 30;

/**
 * Read side of the super-admin console. Every query here is deliberately
 * CROSS-TENANT (it does not filter by the caller's tenantId) — that is the
 * whole point of the platform-operator role. Guarded by @Roles(SUPER_ADMIN) at
 * the controller, so no tenant-scoped user can reach it.
 */
@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(SubscriptionPayment) private readonly subPayments: Repository<SubscriptionPayment>,
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    @InjectRepository(Harvester) private readonly harvesters: Repository<Harvester>,
    @InjectRepository(Plot) private readonly plots: Repository<Plot>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(AccountRequest) private readonly accountRequests: Repository<AccountRequest>,
    private readonly adminsService: AdminsService,
    private readonly tenantsService: TenantsService,
    private readonly mail: MailService,
  ) {}

  // ---------- onboarding + subscription actions (writes) ----------

  /** Create an owner (login) + their trial tenant, and email them the password. */
  async onboardOwner(dto: CreateOwnerDto): Promise<OnboardOwnerResult> {
    const password = dto.password?.trim() || generatePassword();
    const owner = await this.adminsService.createOwner(dto.email, password, dto.name, dto.phone);
    await this.tenantsService.createForOwner(owner, { verifiedPhone: dto.phone });
    const emailed = await this.mail.sendOwnerWelcome(owner.email, owner.name, password);
    return { owner: await this.ownerDetail(owner.id), password, emailed };
  }

  async updateOwner(id: string, dto: UpdateOwnerDto): Promise<OwnerDetail> {
    await this.tenantsService.updateProfile(id, dto);
    return this.ownerDetail(id);
  }

  async extendTrial(id: string, days: number): Promise<OwnerDetail> {
    await this.tenantsService.extendTrial(id, days);
    return this.ownerDetail(id);
  }

  async recordPayment(id: string, dto: RecordPaymentDto, recordedBy: string): Promise<OwnerDetail> {
    await this.tenantsService.recordPayment(id, dto, recordedBy);
    return this.ownerDetail(id);
  }

  async changePlan(id: string, dto: ChangePlanDto): Promise<OwnerDetail> {
    await this.tenantsService.changePlan(id, dto.plan);
    return this.ownerDetail(id);
  }

  async suspend(id: string): Promise<OwnerDetail> {
    await this.tenantsService.suspend(id);
    return this.ownerDetail(id);
  }

  async reactivate(id: string): Promise<OwnerDetail> {
    await this.tenantsService.reactivate(id);
    return this.ownerDetail(id);
  }

  /** Reset an owner's password; returns the new one (generated when omitted). */
  async resetOwnerPassword(id: string, password?: string): Promise<{ password: string }> {
    if (!(await this.tenants.exists({ where: { id } }))) {
      throw new NotFoundException('Owner not found');
    }
    const next = password?.trim() || generatePassword();
    await this.adminsService.resetPasswordById(id, next);
    return { password: next };
  }

  // ---------- overview ----------

  async overview(): Promise<AdminOverview> {
    const tenants = await this.tenants.find();
    const now = Date.now();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newThisMonth = tenants.filter((t) => new Date(t.createdAt).getTime() >= startOfMonth.getTime()).length;
    const expiringWithin = (days: number) =>
      tenants.filter((t) => {
        if (t.status !== SubscriptionStatus.TRIAL || !t.trialEndsAt) return false;
        const end = new Date(t.trialEndsAt).getTime();
        return end >= now && end <= now + days * DAY_MS;
      }).length;

    const usage = await this.usageFor(tenants.map((t) => t.id));
    const dormant = tenants.filter((t) => {
      const last = usage.get(t.id)?.lastActiveAt;
      return !last || now - new Date(last).getTime() > DORMANT_AFTER_DAYS * DAY_MS;
    }).length;

    const volRow = await this.plots
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.totalAmount), 0)', 'vol')
      .getRawOne<{ vol: string }>();
    const pendingAccountRequests = await this.accountRequests.count({
      where: { status: AccountRequestStatus.PENDING },
    });

    return {
      owners: {
        total: tenants.length,
        active: tenants.length - dormant,
        dormant,
        newThisMonth,
      },
      trials: {
        expiringIn7Days: expiringWithin(7),
        expiringIn30Days: expiringWithin(30),
      },
      platformVolume: Number(volRow?.vol ?? 0),
      pendingAccountRequests,
    };
  }

  // ---------- owners list ----------

  async listOwners(query: OwnersQueryDto): Promise<Paginated<OwnerListItem>> {
    const qb = this.tenants.createQueryBuilder('t');
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.search) {
      qb.leftJoin(Admin, 'o', 'o.id = t.id').andWhere(
        '(t.businessName LIKE :q OR t.region LIKE :q OR o.name LIKE :q OR o.email LIKE :q OR o.phone LIKE :q)',
        { q: `%${query.search}%` },
      );
    }
    qb.orderBy('t.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [tenants, total] = await qb.getManyAndCount();
    const ids = tenants.map((t) => t.id);
    const owners = ids.length ? await this.admins.find({ where: { id: In(ids) } }) : [];
    const ownerById = new Map(owners.map((o) => [o.id, o]));
    const usage = await this.usageFor(ids);

    const items = tenants.map((t) => this.toListItem(t, ownerById.get(t.id), usage.get(t.id)!));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  // ---------- owner 360 ----------

  async ownerDetail(id: string): Promise<OwnerDetail> {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Owner not found');

    const owner = await this.admins.findOne({ where: { id } });
    const usage = (await this.usageFor([id])).get(id)!;
    const users = await this.admins.find({
      where: { tenantId: id, role: Role.STAFF_ADMIN },
      order: { createdAt: 'DESC' },
    });
    const payments = await this.subPayments.find({ where: { tenantId: id }, order: { paidAt: 'DESC' } });

    return {
      ...this.toListItem(tenant, owner ?? undefined, usage),
      createdAt: new Date(tenant.createdAt).toISOString(),
      verifiedPhone: tenant.verifiedPhone ?? null,
      machineNumber: tenant.machineNumber ?? null,
      soldBy: tenant.soldBy ?? null,
      notes: tenant.notes ?? null,
      users: users.map((u) => this.adminToDto(u)),
      payments: payments.map((p) => this.paymentToDto(p)),
    };
  }

  // ---------- helpers ----------

  /** Per-tenant usage rollup via grouped queries (no N+1). */
  private async usageFor(ids: string[]): Promise<Map<string, TenantUsage>> {
    const map = new Map<string, TenantUsage>();
    for (const id of ids) {
      map.set(id, {
        harvesters: 0,
        activeHarvesters: 0,
        users: 0,
        customers: 0,
        plots: 0,
        businessVolume: 0,
        lastActiveAt: null,
      });
    }
    if (!ids.length) return map;

    const harv = await this.harvesters
      .createQueryBuilder('h')
      .select('h.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN h.status = :active THEN 1 ELSE 0 END)', 'active')
      .where('h.tenantId IN (:...ids)', { ids })
      .setParameter('active', HarvesterStatus.ACTIVE)
      .groupBy('h.tenantId')
      .getRawMany<{ tenantId: string; total: string; active: string }>();
    for (const r of harv) {
      const u = map.get(r.tenantId);
      if (u) {
        u.harvesters = Number(r.total);
        u.activeHarvesters = Number(r.active);
      }
    }

    const plots = await this.plots
      .createQueryBuilder('p')
      .select('p.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'cnt')
      .addSelect('COALESCE(SUM(p.totalAmount), 0)', 'vol')
      .addSelect('MAX(p.updatedAt)', 'last')
      .where('p.tenantId IN (:...ids)', { ids })
      .groupBy('p.tenantId')
      .getRawMany<{ tenantId: string; cnt: string; vol: string; last: unknown }>();
    for (const r of plots) {
      const u = map.get(r.tenantId);
      if (u) {
        u.plots = Number(r.cnt);
        u.businessVolume = Number(r.vol);
        u.lastActiveAt = maxIso(u.lastActiveAt, r.last);
      }
    }

    const cust = await this.customers
      .createQueryBuilder('c')
      .select('c.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'cnt')
      .addSelect('MAX(c.updatedAt)', 'last')
      .where('c.tenantId IN (:...ids)', { ids })
      .groupBy('c.tenantId')
      .getRawMany<{ tenantId: string; cnt: string; last: unknown }>();
    for (const r of cust) {
      const u = map.get(r.tenantId);
      if (u) {
        u.customers = Number(r.cnt);
        u.lastActiveAt = maxIso(u.lastActiveAt, r.last);
      }
    }

    const staff = await this.admins
      .createQueryBuilder('a')
      .select('a.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'cnt')
      .where('a.tenantId IN (:...ids)', { ids })
      .andWhere('a.role = :role', { role: Role.STAFF_ADMIN })
      .groupBy('a.tenantId')
      .getRawMany<{ tenantId: string; cnt: string }>();
    for (const r of staff) {
      const u = map.get(r.tenantId);
      if (u) u.users = Number(r.cnt);
    }

    // Fold in the other high-frequency write tables for last-active.
    const lastFrom = async (qb: ReturnType<Repository<Expense | Payment>['createQueryBuilder']>) => {
      const rows = await qb.getRawMany<{ tenantId: string; last: unknown }>();
      for (const r of rows) {
        const u = map.get(r.tenantId);
        if (u) u.lastActiveAt = maxIso(u.lastActiveAt, r.last);
      }
    };
    await lastFrom(
      this.expenses
        .createQueryBuilder('e')
        .select('e.tenantId', 'tenantId')
        .addSelect('MAX(e.updatedAt)', 'last')
        .where('e.tenantId IN (:...ids)', { ids })
        .groupBy('e.tenantId'),
    );
    await lastFrom(
      this.payments
        .createQueryBuilder('pm')
        .select('pm.tenantId', 'tenantId')
        .addSelect('MAX(pm.updatedAt)', 'last')
        .where('pm.tenantId IN (:...ids)', { ids })
        .groupBy('pm.tenantId'),
    );

    return map;
  }

  private toListItem(tenant: Tenant, owner: Admin | undefined, usage: TenantUsage): OwnerListItem {
    const end = tenant.currentPeriodEndsAt ?? tenant.trialEndsAt ?? null;
    const daysRemaining = end ? Math.ceil((new Date(end).getTime() - Date.now()) / DAY_MS) : null;
    return {
      id: tenant.id,
      name: owner?.name ?? '',
      email: owner?.email ?? '',
      phone: owner?.phone ?? null,
      businessName: tenant.businessName,
      region: tenant.region ?? null,
      plan: tenant.plan,
      status: tenant.status,
      daysRemaining,
      trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toISOString() : null,
      currentPeriodEndsAt: tenant.currentPeriodEndsAt ? new Date(tenant.currentPeriodEndsAt).toISOString() : null,
      usage,
    };
  }

  private adminToDto(a: Admin): AdminDto {
    return {
      id: a.id,
      tenantId: a.tenantId,
      createdBy: a.createdBy ?? null,
      updatedBy: a.updatedBy ?? null,
      createdAt: new Date(a.createdAt).toISOString(),
      updatedAt: new Date(a.updatedAt).toISOString(),
      name: a.name,
      email: a.email,
      phone: a.phone ?? undefined,
      role: a.role,
      isActive: a.isActive,
      harvesterIds: a.harvesterIds ?? [],
    };
  }

  private paymentToDto(p: SubscriptionPayment): SubscriptionPaymentDto {
    return {
      id: p.id,
      tenantId: p.tenantId,
      amount: p.amount,
      method: p.method,
      paidAt: new Date(p.paidAt).toISOString(),
      periodStart: new Date(p.periodStart).toISOString(),
      periodEnd: new Date(p.periodEnd).toISOString(),
      recordedBy: p.recordedBy ?? null,
      createdAt: new Date(p.createdAt).toISOString(),
    };
  }
}

/** Latest of an existing ISO timestamp and a raw DB value (Date or string). */
function maxIso(current: string | null | undefined, candidate: unknown): string | null {
  if (candidate === null || candidate === undefined) return current ?? null;
  const d = candidate instanceof Date ? candidate : new Date(candidate as string);
  if (isNaN(d.getTime())) return current ?? null;
  const iso = d.toISOString();
  if (!current) return iso;
  return new Date(iso).getTime() > new Date(current).getTime() ? iso : current;
}
