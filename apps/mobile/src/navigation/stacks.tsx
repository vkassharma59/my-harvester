import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminFormScreen } from '@/screens/admins/AdminFormScreen';
import { AdminsScreen } from '@/screens/admins/AdminsScreen';
import { CustomerFormScreen } from '@/screens/customers/CustomerFormScreen';
import { CustomerLedgerScreen } from '@/screens/customers/CustomerLedgerScreen';
import { CustomersScreen } from '@/screens/customers/CustomersScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ExpenseFormScreen } from '@/screens/expenses/ExpenseFormScreen';
import { ExpensesScreen } from '@/screens/expenses/ExpensesScreen';
import { HarvesterFormScreen } from '@/screens/harvesters/HarvesterFormScreen';
import { HarvestersScreen } from '@/screens/harvesters/HarvestersScreen';
import { HarvestFormScreen } from '@/screens/harvests/HarvestFormScreen';
import { HarvestsScreen } from '@/screens/harvests/HarvestsScreen';
import { LabourFormScreen } from '@/screens/labour/LabourFormScreen';
import { LabourScreen } from '@/screens/labour/LabourScreen';
import { MoreMenuScreen } from '@/screens/more/MoreMenuScreen';
import { ReportsScreen } from '@/screens/more/ReportsScreen';
import { SettingsScreen } from '@/screens/more/SettingsScreen';
import {
  CustomersStackParamList,
  DashboardStackParamList,
  ExpensesStackParamList,
  HarvestsStackParamList,
  MoreStackParamList,
} from './types';
import { colors } from '@/theme';

const screenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
};

const Dashboard = createNativeStackNavigator<DashboardStackParamList>();
export function DashboardStack() {
  return (
    <Dashboard.Navigator screenOptions={screenOptions}>
      <Dashboard.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
    </Dashboard.Navigator>
  );
}

const Harvests = createNativeStackNavigator<HarvestsStackParamList>();
export function HarvestsStack() {
  return (
    <Harvests.Navigator screenOptions={screenOptions}>
      <Harvests.Screen name="HarvestsList" component={HarvestsScreen} options={{ title: 'Harvesting Jobs' }} />
      <Harvests.Screen name="HarvestForm" component={HarvestFormScreen} options={{ title: 'New job' }} />
    </Harvests.Navigator>
  );
}

const Customers = createNativeStackNavigator<CustomersStackParamList>();
export function CustomersStack() {
  return (
    <Customers.Navigator screenOptions={screenOptions}>
      <Customers.Screen name="CustomersList" component={CustomersScreen} options={{ title: 'Customers' }} />
      <Customers.Screen
        name="CustomerLedger"
        component={CustomerLedgerScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <Customers.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: 'Add customer' }} />
    </Customers.Navigator>
  );
}

const Expenses = createNativeStackNavigator<ExpensesStackParamList>();
export function ExpensesStack() {
  return (
    <Expenses.Navigator screenOptions={screenOptions}>
      <Expenses.Screen name="ExpensesList" component={ExpensesScreen} options={{ title: 'Expenses' }} />
      <Expenses.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: 'Add expense' }} />
    </Expenses.Navigator>
  );
}

const More = createNativeStackNavigator<MoreStackParamList>();
export function MoreStack() {
  return (
    <More.Navigator screenOptions={screenOptions}>
      <More.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: 'More' }} />
      <More.Screen name="Harvesters" component={HarvestersScreen} options={{ title: 'Harvesters' }} />
      <More.Screen name="HarvesterForm" component={HarvesterFormScreen} options={{ title: 'Add harvester' }} />
      <More.Screen name="Labour" component={LabourScreen} options={{ title: 'Labour' }} />
      <More.Screen name="LabourForm" component={LabourFormScreen} options={{ title: 'Add labour' }} />
      <More.Screen name="Admins" component={AdminsScreen} options={{ title: 'Staff Admins' }} />
      <More.Screen name="AdminForm" component={AdminFormScreen} options={{ title: 'Add admin' }} />
      <More.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <More.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </More.Navigator>
  );
}
