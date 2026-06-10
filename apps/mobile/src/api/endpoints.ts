import {
  Admin,
  AppSettings,
  AreaUnit,
  Customer,
  CustomerLedger,
  DashboardSummary,
  Expense,
  ExpenseType,
  Harvester,
  HarvesterStatus,
  HarvesterType,
  HarvestType,
  Labour,
  LabourType,
  Payment,
  PartyType,
  PaymentStatus,
  Plot,
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
}
export interface UpdateAdminInput {
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
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
}
export const settingsApi = {
  get: () => api.get<AppSettings>('/settings').then((r) => r.data),
  update: (body: SettingsInput) => api.patch<AppSettings>('/settings', body).then((r) => r.data),
};

// ---------- Expenses ----------
export interface ExpenseInput {
  harvesterId: string;
  type: ExpenseType;
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

// ---------- Labour ----------
export interface LabourInput {
  name: string;
  mobile: string;
  type: LabourType;
  harvesterId: string;
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
