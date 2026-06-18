import type {
  AccountRequestItem,
  AdminOverview,
  BugReportItem,
  BugStatus,
  OnboardOwnerResult,
  OwnerDetail,
  OwnerDistribution,
  OwnerListItem,
  Paginated,
  PaymentMethod,
  Plan,
  SubscriptionStatus,
} from '@wh/shared';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3200/api/v1';
const TOKEN_KEY = 'wh_admin_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** A failed API call. `code` carries the backend's stable error code when present. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) {
      // Token expired or no longer valid (e.g. the account was recreated):
      // drop it and signal the app to return to the login screen.
      tokenStore.clear();
      window.dispatchEvent(new Event('wh-unauthorized'));
    }
    const raw = data?.message ?? data?.error ?? res.statusText;
    throw new ApiError(res.status, Array.isArray(raw) ? raw.join(', ') : String(raw), data?.code);
  }
  return data as T;
}

// ---------- auth ----------

export interface LoginAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
}
export interface LoginResult {
  accessToken: string;
  admin: LoginAdmin;
}
export const login = (identifier: string, password: string) =>
  request<LoginResult>('POST', '/auth/login', { identifier, password });

// ---------- super-admin ----------

export const getOverview = () => request<AdminOverview>('GET', '/admin/overview');

export const getOwnerDistribution = () =>
  request<OwnerDistribution>('GET', '/admin/owner-distribution');

export interface OwnersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: SubscriptionStatus;
}
export const listOwners = (p: OwnersParams) => {
  const q = new URLSearchParams();
  if (p.page) q.set('page', String(p.page));
  if (p.pageSize) q.set('pageSize', String(p.pageSize));
  if (p.search) q.set('search', p.search);
  if (p.status) q.set('status', p.status);
  return request<Paginated<OwnerListItem>>('GET', `/admin/owners?${q.toString()}`);
};

export const getOwner = (id: string) => request<OwnerDetail>('GET', `/admin/owners/${id}`);

export interface OnboardInput {
  name: string;
  email: string;
  phone: string;
  state: string;
  district: string;
  password: string;
}
export const onboardOwner = (dto: OnboardInput) =>
  request<OnboardOwnerResult>('POST', '/admin/owners', dto);

export interface UpdateOwnerInput {
  businessName?: string;
  region?: string;
  state?: string;
  district?: string;
  verifiedPhone?: string;
  machineNumber?: string;
  soldBy?: string;
  notes?: string;
}
export const updateOwner = (id: string, dto: UpdateOwnerInput) =>
  request<OwnerDetail>('PATCH', `/admin/owners/${id}`, dto);

export const extendTrial = (id: string, months: number) =>
  request<OwnerDetail>('POST', `/admin/owners/${id}/extend-trial`, { months });

export interface RecordPaymentInput {
  amount: number;
  method: PaymentMethod;
  periodMonths?: number;
  paidAt?: string;
}
export const recordPayment = (id: string, dto: RecordPaymentInput) =>
  request<OwnerDetail>('POST', `/admin/owners/${id}/payments`, dto);

export const changePlan = (id: string, plan: Plan) =>
  request<OwnerDetail>('PATCH', `/admin/owners/${id}/plan`, { plan });

export const suspendOwner = (id: string) =>
  request<OwnerDetail>('POST', `/admin/owners/${id}/suspend`);

export const reactivateOwner = (id: string) =>
  request<OwnerDetail>('POST', `/admin/owners/${id}/reactivate`);

export const resetPassword = (id: string, password?: string) =>
  request<{ password: string }>('POST', `/admin/owners/${id}/reset-password`, password ? { password } : {});

// ---------- account requests ----------

export const getAccountRequests = () => request<AccountRequestItem[]>('GET', '/admin/account-requests');
export const approveAccountRequest = (id: string) =>
  request<OwnerDetail>('POST', `/admin/account-requests/${id}/approve`);
export const rejectAccountRequest = (id: string) =>
  request<AccountRequestItem>('POST', `/admin/account-requests/${id}/reject`);

// ---------- bug reports ----------

export const getBugReports = () => request<BugReportItem[]>('GET', '/admin/bug-reports');
export const setBugStatus = (id: string, status: BugStatus) =>
  request<BugReportItem>('PATCH', `/admin/bug-reports/${id}`, { status });
