import {
  AccountRequestStatus,
  AreaUnit,
  BugStatus,
  ExpenseType,
  HarvestType,
  HarvesterStatus,
  HarvesterType,
  LabourType,
  PartyType,
  PaymentMethod,
  PaymentStatus,
  Plan,
  Role,
  SubscriptionStatus,
  WageType,
} from './enums';

/** Fields present on every persisted record. `updatedBy` satisfies the audit
 *  requirement: every record carries who last touched it. */
export interface AuditFields {
  id: string;
  /** Owning tenant — the super admin (owner) the record belongs to. Every
   *  query is scoped by this so owners only ever see their own data. */
  tenantId: string;
  createdBy?: string | null; // Admin id
  updatedBy?: string | null; // Admin id
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface Admin extends AuditFields {
  name: string;
  /** Optional for staff admins (they can log in by mobile); owners always have one. */
  email?: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  /** Harvesters a staff admin may access. Ignored for OWNER (sees all). */
  harvesterIds?: string[];
  // passwordHash is never sent to the client
}

export interface Harvester extends AuditFields {
  name: string; // e.g. "Harvester 1"
  registrationNo?: string;
  status: HarvesterStatus;

  type: HarvesterType;
  /** COMBINE: the single per-unit harvesting rate. */
  ratePerUnit?: number;
  /** BHUSA: per-unit rate when the customer keeps the Bhusa. */
  rateWithBhusa?: number;
  /** BHUSA: per-unit rate when the Bhusa is taken/sold separately. */
  rateWithoutBhusa?: number;
}

export interface Customer extends AuditFields {
  name: string;
  phone: string;
  village?: string;
  address?: string;
  /** Source contact id from the device, if imported. */
  deviceContactId?: string;
}

export interface Expense extends AuditFields {
  harvesterId: string;
  date: string; // ISO date
  type: ExpenseType;
  /** Set for custom (super-admin-defined) categories; type is OTHER then. */
  categoryId?: string | null;
  /** Set for DIESEL expenses: the fuel pump the diesel was bought from. */
  pumpId?: string | null;
  amount: number;
  notes?: string;
  attachmentUrl?: string;
  /** When type is LABOUR, the labourer this payment is for. */
  labourId?: string | null;
}

/** A super-admin-defined expense category, available to all admins in the tenant. */
export interface ExpenseCategory extends AuditFields {
  name: string;
  isActive: boolean;
}

/** A diesel supplier. One pump can serve multiple harvesters (many-to-many). */
export interface FuelPump extends AuditFields {
  name: string;
  phone?: string;
  harvesterIds: string[];
  isActive: boolean;
}

/** A fuel pump's account: diesel bought (bill) vs paid, with payment history. */
export interface FuelPumpLedger {
  pump: FuelPump;
  totalBill: number;
  amountPaid: number;
  remaining: number;
  payments: Payment[];
}

/** A fuel pump row enriched with its diesel bill / paid / remaining (list view). */
export interface FuelPumpListItem extends FuelPump {
  totalBill: number;
  amountPaid: number;
  remaining: number;
}

export interface Labour extends AuditFields {
  name: string;
  mobile: string;
  type: LabourType;
  /** Free-text role label, set only when type is OTHER. */
  customType?: string;
  harvesterId: string;
  /** DAILY: dailyWage is the per-day rate. FIXED: customAmount is the total. */
  wageType: WageType;
  dailyWage?: number;
  customAmount?: number;
  paymentStatus: PaymentStatus;
}

/** A worker row enriched with their computed bill (drives the workers list). */
export interface LabourListItem extends Labour {
  totalBill: number;
  amountPaid: number;
  remaining: number;
  totalWorkingDays: number;
}

/** A worker's account: what they're owed vs paid, with payment history. */
export interface LabourLedger {
  labour: Labour;
  totalBill: number;
  amountPaid: number;
  remaining: number;
  totalWorkingDays: number;
  payments: Payment[];
}

/** A commission agent attached to a single harvester. Earns a per-unit-area
 *  commission on the harvesting jobs they are assigned to. */
export interface Agent extends AuditFields {
  name: string;
  phone?: string;
  harvesterId: string;
  /** Commission amount per unit of area (e.g. 200 per bigha/acre). */
  commissionRate: number;
  isActive: boolean;
}

/** A Bhusa buyer on a job and the amount they owe for the Bhusa. */
export interface BhusaBuyer {
  customerId: string;
  amount: number;
}

/** A plot of land for a harvesting job. Carries the commercial terms. */
export interface Plot extends AuditFields {
  customerId: string;
  harvesterId: string;
  plotName: string;
  village?: string;
  area: number;
  areaUnit: AreaUnit;
  harvestDate: string; // ISO date
  remarks?: string;

  harvestType: HarvestType;

  // Type 1 & 2: harvesting charge to the landowner
  ratePerBigha: number; // may override the configured default
  harvestingAmount: number; // computed = area * ratePerBigha

  // Type 2 only: Bhusa sold to one or more buyers, each owing their own amount.
  bhusaBuyers?: BhusaBuyer[];
  /** Legacy single buyer (older jobs); superseded by bhusaBuyers. */
  bhusaBuyerId?: string;
  /** Total Bhusa amount (sum of bhusaBuyers' amounts). */
  bhusaAmount?: number;

  /** harvestingAmount + (bhusaAmount ?? 0) */
  totalAmount: number;

  // Optional commission agent for this job.
  agentId?: string | null;
  /** computed = agent.commissionRate * area (0 when no agent). */
  commissionAmount?: number;
}

export interface Payment extends AuditFields {
  partyType: PartyType;
  /** customerId, bhusaBuyer customerId, or labourId depending on partyType. */
  partyId: string;
  plotId?: string; // links a payment to a specific job when relevant
  harvesterId?: string;
  date: string; // ISO date
  amount: number;
  notes?: string;
  /** Optional receipt / proof file. */
  attachmentUrl?: string;
}

/** App-wide configurable defaults. Rates now live per-harvester. */
export interface AppSettings extends AuditFields {
  currency: string; // e.g. "INR"
  defaultAreaUnit: AreaUnit;
  /** Business/firm name shown in payment reminders. */
  firmName?: string;
  /** Owner's UPI ID (VPA) for collecting payments. */
  upiId?: string;
}

// ---------- Aggregated read models (dashboard / ledger) ----------

export interface DashboardSummary {
  harvesterId: string | 'ALL';
  financial: {
    totalEarnings: number;
    /** Recorded expenses + agent commission. */
    totalExpenses: number;
    netProfit: number;
    pendingReceivables: number;
    /** Commission earned by agents on jobs (also included in totalExpenses). */
    agentCommission: number;
  };
  harvesting: {
    totalCustomers: number;
    totalPlots: number;
    totalArea: number;
    totalJobsCompleted: number;
  };
  expenses: Record<ExpenseType, number>;
  /** Super-admin-defined categories with their summed amounts. */
  customExpenses: { id: string; name: string; amount: number }[];
  labour: {
    totalCost: number;
    amountPaid: number;
    remaining: number;
  };
}

export interface CustomerLedger {
  customer: Customer;
  totalHarvestedArea: number;
  plots: Plot[];
  totalBillAmount: number;
  amountPaid: number;
  outstanding: number;
  payments: Payment[];
}

/** Commission ledger for an agent: earned (from jobs) vs paid. */
export interface AgentLedger {
  agent: Agent;
  /** Jobs this agent earned commission on (newest first). */
  plots: Plot[];
  totalCommission: number;
  amountPaid: number;
  outstanding: number;
  payments: Payment[];
}

/** An agent row enriched with commission earned / paid / outstanding (list view). */
export interface AgentListItem extends Agent {
  totalCommission: number;
  amountPaid: number;
  outstanding: number;
}

// ---------- Tenant / subscription (super-admin domain) ----------

/** A tenant — one harvester business. The billing & profile record for an OWNER,
 *  keyed by the owner's admin id (== `tenantId` on every other record). The
 *  `admins` table stays auth-only; everything commercial lives here. */
export interface Tenant {
  /** == the owner admin id, which is the tenantId used to scope all data. */
  id: string;
  businessName: string;
  /** Village / mandi — used for filtering and abuse clustering. */
  region?: string | null;
  /** OTP-verified mobile — the anti-abuse identity anchor. */
  verifiedPhone?: string | null;
  /** Harvester registration number; duplicates flag likely repeat free trials. */
  machineNumber?: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  trialStartedAt?: string | null; // ISO date
  trialEndsAt?: string | null; // ISO date
  /** Paid period end (set once they convert from trial). */
  currentPeriodEndsAt?: string | null; // ISO date
  /** Reseller / referral source, if sold through an agent. */
  soldBy?: string | null;
  /** Private super-admin support notes. */
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A manually-recorded subscription payment (cash/UPI), captured by the super
 *  admin. Recording one extends the tenant's paid period. */
export interface SubscriptionPayment {
  id: string;
  tenantId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string; // ISO date
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  recordedBy?: string | null; // super-admin id
  createdAt: string;
}

// ---------- Super-admin console read models ----------

/** A generic paginated response, used by the owners list and other admin tables. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Usage rollup for one tenant, computed across their data. */
export interface TenantUsage {
  harvesters: number;
  activeHarvesters: number;
  /** Staff users the owner has created. */
  users: number;
  customers: number;
  plots: number;
  /** Sum of plot totalAmount — the owner's business volume (our "GMV"). */
  businessVolume: number;
  /** Last time any of the tenant's records was written, or null if none. */
  lastActiveAt?: string | null;
}

/** A row in the super-admin "Owners" table. */
export interface OwnerListItem {
  /** Owner admin id == tenantId. */
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  businessName: string;
  region?: string | null;
  /** Indian State / UT the owner operates from. */
  state?: string | null;
  /** District within `state`. */
  district?: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  /** Days until trial/period end; negative once expired, null if neither set. */
  daysRemaining: number | null;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  usage: TenantUsage;
}

/** A harvester option for the owner-detail usage filter. */
export interface OwnerHarvesterOption {
  id: string;
  name: string;
}

/** Per-harvester (or all) usage metrics for the owner-detail usage card. */
export interface OwnerUsageSummary {
  totalEarnings: number;
  netProfit: number;
  pendingReceivables: number;
  customers: number;
  plots: number;
}

/** Full 360 view of one owner for the detail screen. */
export interface OwnerDetail extends OwnerListItem {
  createdAt: string;
  /** Active harvesters (for the usage filter dropdown). */
  harvesters: OwnerHarvesterOption[];
  verifiedPhone?: string | null;
  machineNumber?: string | null;
  soldBy?: string | null;
  notes?: string | null;
  /** Staff users the owner has created. */
  users: Admin[];
  /** Subscription payment history (newest first). */
  payments: SubscriptionPayment[];
}

/** Result of onboarding a new owner — includes the one-time plaintext password
 *  so the super admin can hand it over (e.g. via WhatsApp) as a fallback. */
export interface OnboardOwnerResult {
  owner: OwnerDetail;
  /** Plaintext login password, returned ONCE at creation and never again. */
  password: string;
  /** Whether the credentials email was actually sent (false if SMTP off / failed). */
  emailed: boolean;
}

/** A bug reported from the mobile app by an owner/staff admin. */
export interface BugReport extends AuditFields {
  title: string;
  description: string;
  screenshotUrl?: string | null;
  status: BugStatus;
}

/** A bug as shown to the super admin (enriched with reporter + business). */
export interface BugReportItem {
  id: string;
  title: string;
  description: string;
  screenshotUrl?: string | null;
  status: BugStatus;
  /** Admin who filed it. */
  reporterName: string;
  /** The owner/tenant the reporter belongs to. */
  businessName: string;
  tenantId: string;
  createdAt: string;
}

/** A self-service owner-account request, shown to the super admin for approval. */
export interface AccountRequestItem {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  harvesterCount: number;
  /** Indian State / UT the requester operates from. */
  state?: string | null;
  /** District within `state`. */
  district?: string | null;
  status: AccountRequestStatus;
  createdAt: string;
}

/** Owner count for a single district. */
export interface OwnerDistrictCount {
  district: string;
  count: number;
}

/** Owner counts for one state, with its district breakdown (desc by count). */
export interface OwnerStateDistribution {
  state: string;
  count: number;
  districts: OwnerDistrictCount[];
}

/** Owners grouped by state → district, for the overview map. */
export interface OwnerDistribution {
  states: OwnerStateDistribution[];
  /** Total owners that have a recorded state (sum of states[].count). */
  total: number;
}

/** KPI snapshot for the super-admin overview screen. */
export interface AdminOverview {
  owners: {
    total: number;
    /** TRIAL or ACTIVE and not dormant. */
    active: number;
    /** No writes within the dormancy window. */
    dormant: number;
    newThisMonth: number;
  };
  trials: {
    expiringIn7Days: number;
    expiringIn30Days: number;
  };
  /** Sum of business volume across all tenants. */
  platformVolume: number;
  /** Account requests awaiting the super admin's action. */
  pendingAccountRequests: number;
  /** Open (unresolved) bug reports across all tenants. */
  activeBugs: number;
}
