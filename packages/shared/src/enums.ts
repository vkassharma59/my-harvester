/**
 * Domain enums — the single source of truth shared by the API and the mobile app.
 * Keep values as plain strings so they serialize cleanly over JSON and store
 * readably in MongoDB.
 */

export enum Role {
  /** The platform operator (us). Manages every tenant from the web console;
   *  the only role that reads across tenants. Not used by the mobile app. */
  SUPER_ADMIN = 'SUPER_ADMIN',
  /** A harvester business owner — the tenant root that owns all its data. */
  OWNER = 'OWNER',
  /** Staff working under an owner, scoped to assigned harvesters. */
  STAFF_ADMIN = 'STAFF_ADMIN',
}

/** A tenant's subscription lifecycle. Drives whether the owner can still write. */
export enum SubscriptionStatus {
  /** Inside the free period (default for a freshly onboarded owner). */
  TRIAL = 'TRIAL',
  /** Paid and current. */
  ACTIVE = 'ACTIVE',
  /** Trial/period lapsed — reads still work, writes are blocked. */
  EXPIRED = 'EXPIRED',
  /** Manually disabled by the super admin (e.g. abuse). */
  SUSPENDED = 'SUSPENDED',
}

/** Subscription plan. Kept deliberately minimal until paid plans launch. */
export enum Plan {
  FREE_TRIAL = 'FREE_TRIAL',
  PAID = 'PAID',
}

/** How a subscription payment was collected. India: mostly cash/UPI, recorded
 *  manually by the super admin (no automated card billing yet). */
export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
}

export enum ExpenseType {
  DIESEL = 'DIESEL',
  LABOUR = 'LABOUR',
  SPARE_PARTS = 'SPARE_PARTS',
  OTHER = 'OTHER',
}

export enum LabourType {
  HARVESTER_DRIVER = 'HARVESTER_DRIVER',
  TRACTOR_DRIVER = 'TRACTOR_DRIVER',
  HELPER = 'HELPER',
  /** A free-text role; the label is stored in Labour.customType. */
  OTHER = 'OTHER',
}

/** How a worker is paid: a daily rate (× attendance) or a fixed amount. */
export enum WageType {
  DAILY = 'DAILY',
  FIXED = 'FIXED',
}

/** Harvesting commercial models from the spec. */
export enum HarvestType {
  /** Type 1: customer pays per Bigha and keeps the Bhusa. */
  PER_BIGHA_WITH_BHUSA = 'PER_BIGHA_WITH_BHUSA',
  /** Type 2: landowner pays harvesting rate; Bhusa sold separately to a buyer. */
  WITHOUT_BHUSA = 'WITHOUT_BHUSA',
}

/** Unit used to measure plot area. */
export enum AreaUnit {
  BIGHA = 'BIGHA',
  ACRE = 'ACRE',
}

/** The kind of harvesting machine. Drives which rate fields a harvester has. */
export enum HarvesterType {
  /** A single per-unit harvesting rate. */
  COMBINE = 'COMBINE',
  /** Separate rates for "with Bhusa" and "without Bhusa". */
  BHUSA = 'BHUSA',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

/** Who a payment is from / to, so the ledger can be reconstructed. */
export enum PartyType {
  CUSTOMER = 'CUSTOMER',
  BHUSA_BUYER = 'BHUSA_BUYER',
  LABOUR = 'LABOUR',
  AGENT = 'AGENT',
  FUEL_PUMP = 'FUEL_PUMP',
}

export enum HarvesterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/** A self-service owner account request, approved by the platform admin. */
export enum AccountRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Special sentinel for the dashboard "All Harvesters" consolidated view. */
export const ALL_HARVESTERS = 'ALL' as const;
