import { NavigatorScreenParams } from '@react-navigation/native';

export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerLedger: { customerId: string; name: string };
  CustomerForm: { customerId?: string } | undefined;
  // Edit a job from a customer's ledger without leaving the Customers tab.
  HarvestForm: { plotId?: string } | undefined;
};

export type HarvestsStackParamList = {
  HarvestsList: { customerId?: string; customerName?: string } | undefined;
  HarvestForm: { plotId?: string } | undefined;
};

export type ExpensesStackParamList = {
  ExpensesList: undefined;
  ExpenseForm: { expenseId?: string; presetCategory?: string } | undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Harvesters: undefined;
  HarvesterForm: { harvesterId?: string } | undefined;
  Labour: undefined;
  LabourForm: { labourId?: string } | undefined;
  LabourLedger: { labourId: string; name: string };
  Attendance: { labourId: string; name: string };
  Agents: undefined;
  AgentForm: { agentId?: string } | undefined;
  AgentLedger: { agentId: string; name: string };
  Admins: undefined;
  AdminForm: { adminId?: string } | undefined;
  ExpenseCategories: undefined;
  ExpenseCategoryForm: { categoryId?: string } | undefined;
  FuelPumps: undefined;
  FuelPumpForm: { pumpId?: string } | undefined;
  FuelPumpLedger: { pumpId: string; name: string };
  Reports: undefined;
  ReportBug: undefined;
  EditProfile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  App: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { identifier: string };
  RequestAccount: undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
};

export type AppTabsParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  HarvestsTab: NavigatorScreenParams<HarvestsStackParamList>;
  CustomersTab: NavigatorScreenParams<CustomersStackParamList>;
  ExpensesTab: NavigatorScreenParams<ExpensesStackParamList>;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};
