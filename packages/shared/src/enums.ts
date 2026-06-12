/**
 * Domain enums — the single source of truth shared by the API and the mobile app.
 * Keep values as plain strings so they serialize cleanly over JSON and store
 * readably in MongoDB.
 */

export enum Role {
  /** Can manage other admins. The first/owner account. */
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
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
}

export enum HarvesterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/** Special sentinel for the dashboard "All Harvesters" consolidated view. */
export const ALL_HARVESTERS = 'ALL' as const;
