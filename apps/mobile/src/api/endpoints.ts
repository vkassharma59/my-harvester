import {
  Admin,
  Agent,
  AgentLedger,
  AppSettings,
  AreaUnit,
  BhusaBuyer,
  Customer,
  CustomerLedger,
  DashboardSummary,
  Expense,
  ExpenseCategory,
  ExpenseType,
  Harvester,
  HarvesterStatus,
  HarvesterType,
  HarvestType,
  Labour,
  LabourLedger,
  LabourType,
  Payment,
  PartyType,
  PaymentStatus,
  Plot,
  WageType,
} from '@wh/shared';
import { api } from './client';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ---------- Auth ----------
export interface LoginResult {
  accessToken: string;
  admin: Admin;
}
export const authApi = {
  /** identifier may be an email address or a 10-digit mobile number. */
  login: (identifier: string, password: string) =>
    api.post<LoginResult>('/auth/login', { identifier, password }).then((r) => r.data),
  me: () => api.get<Admin>('/auth/me').then((r) => r.data),
};

// ---------- Admins (SUPER_ADMIN only) ----------
export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  harvesterIds?: string[];
}
export interface UpdateAdminInput {
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  harvesterIds?: string[];
}
export const adminsApi = {
  list: () => api.get<Admin[]>('/admins').then((r) => r.data),
  get: (id: string) => api.get<Admin>(`/admins/${id}`).then((r) => r.data),
  create: (body: CreateAdminInput) => api.post<Admin>('/admins', body).then((r) => r.data),
  update: (id: string, body: UpdateAdminInput) =>
    api.patch<Admin>(`/admins/${id}`, body).then((r) => r.data),
  changePassword: (id: string, newPassword: string) =>
    api.patch(`/admins/${id}/password`, { newPassword }).then(() => undefined),
};

// ---------- Harvesters ----------
export interface HarvesterInput {
  name: string;
  registrationNo?: string;
  model?: string;
  notes?: string;
  type: HarvesterType;
  ratePerUnit?: number;
  rateWithBhusa?: number;
  rateWithoutBhusa?: number;
}
export const harvestersApi = {
  list: (status?: HarvesterStatus) =>
    api.get<Harvester[]>('/harvesters', { params: { status } }).then((r) => r.data),
  create: (body: HarvesterInput) => api.post<Harvester>('/harvesters', body).then((r) => r.data),
  update: (id: string, body: Partial<HarvesterInput>) =>
    api.patch<Harvester>(`/harvesters/${id}`, body).then((r) => r.data),
  activate: (id: string) => api.patch<Harvester>(`/harvesters/${id}/activate`).then((r) => r.data),
  deactivate: (id: string) =>
    api.patch<Harvester>(`/harvesters/${id}/deactivate`).then((r) => r.data),
};

// ---------- Customers ----------
export interface CustomerInput {
  name: string;
  phone: string;
  village?: string;
  address?: string;
  deviceContactId?: string;
}
export interface CustomerListItem extends Customer {
  totalBill: number;
  amountPaid: number;
  outstanding: number;
}
export const customersApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<Paginated<CustomerListItem>>('/customers', { params }).then((r) => r.data),
  get: (id: string) => api.get<Customer>(`/customers/${id}`).then((r) => r.data),
  create: (body: CustomerInput) => api.post<Customer>('/customers', body).then((r) => r.data),
  update: (id: string, body: Partial<CustomerInput>) =>
    api.patch<Customer>(`/customers/${id}`, body).then((r) => r.data),
  ledger: (id: string) => api.get<CustomerLedger>(`/customers/${id}/ledger`).then((r) => r.data),
};

// ---------- Settings ----------
export interface SettingsInput {
  currency?: string;
  defaultAreaUnit?: AreaUnit;
  firmName?: string;
}
export const settingsApi = {
  get: () => api.get<AppSettings>('/settings').then((r) => r.data),
  update: (body: SettingsInput) => api.patch<AppSettings>('/settings', body).then((r) => r.data),
};

// ---------- Expenses ----------
export interface ExpenseInput {
  harvesterId: string;
  type: ExpenseType;
  /** A custom category id, or null for a built-in type. */
  categoryId?: string | null;
  amount: number;
  date?: string;
  notes?: string;
  attachmentUrl?: string;
  /** Required when type is LABOUR — the labourer being paid. */
  labourId?: string;
}
export const expensesApi = {
  list: (params?: { harvesterId?: string; type?: ExpenseType; from?: string; to?: string }) =>
    api.get<Expense[]>('/expenses', { params }).then((r) => r.data),
  create: (body: ExpenseInput) => api.post<Expense>('/expenses', body).then((r) => r.data),
  update: (id: string, body: Partial<ExpenseInput>) =>
    api.patch<Expense>(`/expenses/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/expenses/${id}`).then(() => undefined),
};

// ---------- Expense categories (custom; SUPER_ADMIN manages) ----------
export interface ExpenseCategoryInput {
  name: string;
  isActive?: boolean;
}
export const expenseCategoriesApi = {
  list: () => api.get<ExpenseCategory[]>('/expense-categories').then((r) => r.data),
  create: (body: ExpenseCategoryInput) =>
    api.post<ExpenseCategory>('/expense-categories', body).then((r) => r.data),
  update: (id: string, body: Partial<ExpenseCategoryInput>) =>
    api.patch<ExpenseCategory>(`/expense-categories/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/expense-categories/${id}`).then(() => undefined),
};

// ---------- Labour ----------
export interface LabourInput {
  name: string;
  mobile: string;
  type: LabourType;
  customType?: string;
  harvesterId: string;
  wageType?: WageType;
  dailyWage?: number;
  customAmount?: number;
  paymentStatus?: PaymentStatus;
}
export const labourApi = {
  list: (harvesterId?: string) =>
    api.get<Labour[]>('/labour', { params: { harvesterId } }).then((r) => r.data),
  create: (body: LabourInput) => api.post<Labour>('/labour', body).then((r) => r.data),
  update: (id: string, body: Partial<LabourInput>) =>
    api.patch<Labour>(`/labour/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/labour/${id}`).then(() => undefined),
  ledger: (id: string) => api.get<LabourLedger>(`/labour/${id}/ledger`).then((r) => r.data),
};

// ---------- Agents (commission) ----------
export interface AgentInput {
  name: string;
  phone?: string;
  harvesterId: string;
  commissionRate: number;
  isActive?: boolean;
}
export const agentsApi = {
  list: (harvesterId?: string) =>
    api.get<Agent[]>('/agents', { params: { harvesterId } }).then((r) => r.data),
  create: (body: AgentInput) => api.post<Agent>('/agents', body).then((r) => r.data),
  update: (id: string, body: Partial<AgentInput>) =>
    api.patch<Agent>(`/agents/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/agents/${id}`).then(() => undefined),
  ledger: (id: string) => api.get<AgentLedger>(`/agents/${id}/ledger`).then((r) => r.data),
};

// ---------- Plots (harvesting jobs) ----------
export interface PlotInput {
  customerId: string;
  harvesterId: string;
  plotName: string;
  area: number;
  harvestDate: string;
  harvestType: HarvestType;
  areaUnit?: AreaUnit;
  village?: string;
  remarks?: string;
  ratePerBigha?: number;
  bhusaBuyerId?: string;
  bhusaAmount?: number;
  /** Multiple Bhusa buyers, each with their own amount (Type 2). */
  bhusaBuyers?: BhusaBuyer[];
  /** Commission agent for this job; null clears it. */
  agentId?: string | null;
}
export const plotsApi = {
  list: (params?: { harvesterId?: string; customerId?: string }) =>
    api.get<Plot[]>('/plots', { params }).then((r) => r.data),
  get: (id: string) => api.get<Plot>(`/plots/${id}`).then((r) => r.data),
  create: (body: PlotInput) => api.post<Plot>('/plots', body).then((r) => r.data),
  update: (id: string, body: Partial<PlotInput>) =>
    api.patch<Plot>(`/plots/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/plots/${id}`).then(() => undefined),
};

// ---------- Payments ----------
export interface PaymentInput {
  partyType: PartyType;
  partyId: string;
  amount: number;
  date?: string;
  plotId?: string;
  harvesterId?: string;
  notes?: string;
}
export const paymentsApi = {
  list: (params?: { partyType?: PartyType; partyId?: string; harvesterId?: string }) =>
    api.get<Payment[]>('/payments', { params }).then((r) => r.data),
  create: (body: PaymentInput) => api.post<Payment>('/payments', body).then((r) => r.data),
  update: (id: string, body: Partial<PaymentInput>) =>
    api.patch<Payment>(`/payments/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/payments/${id}`).then(() => undefined),
};

// ---------- Dashboard ----------
export const dashboardApi = {
  summary: (harvesterId?: string) =>
    api.get<DashboardSummary>('/dashboard/summary', { params: { harvesterId } }).then((r) => r.data),
};

// ---------- Maintenance (SUPER_ADMIN only) ----------
export const maintenanceApi = {
  clearData: () =>
    api.delete<{ deleted: Record<string, number> }>('/maintenance/data').then((r) => r.data),
};
