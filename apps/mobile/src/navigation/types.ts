import { NavigatorScreenParams } from '@react-navigation/native';

export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerLedger: { customerId: string; name: string };
  CustomerForm: { customerId?: string } | undefined;
};

export type HarvestsStackParamList = {
  HarvestsList: undefined;
  HarvestForm: { plotId?: string } | undefined;
};

export type ExpensesStackParamList = {
  ExpensesList: undefined;
  ExpenseForm: { expenseId?: string } | undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Harvesters: undefined;
  HarvesterForm: { harvesterId?: string } | undefined;
  Labour: undefined;
  LabourForm: { labourId?: string } | undefined;
  Admins: undefined;
  AdminForm: { adminId?: string } | undefined;
  Reports: undefined;
  Settings: undefined;
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
