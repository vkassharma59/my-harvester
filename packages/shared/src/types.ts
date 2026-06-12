import {
  AreaUnit,
  ExpenseType,
  HarvestType,
  HarvesterStatus,
  HarvesterType,
  LabourType,
  PartyType,
  PaymentStatus,
  Role,
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
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  /** Harvesters a staff ADMIN may access. Ignored for SUPER_ADMIN (sees all). */
  harvesterIds?: string[];
  // passwordHash is never sent to the client
}

export interface Harvester extends AuditFields {
  name: string; // e.g. "Harvester 1"
  registrationNo?: string;
  model?: string;
  status: HarvesterStatus;
  notes?: string;

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
  amount: number;
  notes?: string;
  attachmentUrl?: string;
  /** When type is LABOUR, the labourer this payment is for. */
  labourId?: string | null;
}

export interface Labour extends AuditFields {
  name: string;
  mobile: string;
  type: LabourType;
  harvesterId: string;
  /** Either a recurring daily wage or a one-off custom amount. */
  dailyWage?: number;
  customAmount?: number;
  paymentStatus: PaymentStatus;
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
}

/** App-wide configurable defaults. Rates now live per-harvester. */
export interface AppSettings extends AuditFields {
  currency: string; // e.g. "INR"
  defaultAreaUnit: AreaUnit;
  /** Business/firm name shown in payment reminders. */
  firmName?: string;
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
  labour: {
    totalCost: number;
    pendingPayments: number;
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
