import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminFormScreen } from '@/screens/admins/AdminFormScreen';
import { AdminsScreen } from '@/screens/admins/AdminsScreen';
import { AgentFormScreen } from '@/screens/agents/AgentFormScreen';
import { AgentLedgerScreen } from '@/screens/agents/AgentLedgerScreen';
import { AgentsScreen } from '@/screens/agents/AgentsScreen';
import { CustomerFormScreen } from '@/screens/customers/CustomerFormScreen';
import { CustomerLedgerScreen } from '@/screens/customers/CustomerLedgerScreen';
import { CustomersScreen } from '@/screens/customers/CustomersScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { ExpenseCategoriesScreen } from '@/screens/expenses/ExpenseCategoriesScreen';
import { ExpenseCategoryFormScreen } from '@/screens/expenses/ExpenseCategoryFormScreen';
import { ExpenseFormScreen } from '@/screens/expenses/ExpenseFormScreen';
import { ExpensesScreen } from '@/screens/expenses/ExpensesScreen';
import { FuelPumpFormScreen } from '@/screens/fuel-pumps/FuelPumpFormScreen';
import { FuelPumpLedgerScreen } from '@/screens/fuel-pumps/FuelPumpLedgerScreen';
import { FuelPumpsScreen } from '@/screens/fuel-pumps/FuelPumpsScreen';
import { HarvesterFormScreen } from '@/screens/harvesters/HarvesterFormScreen';
import { HarvestersScreen } from '@/screens/harvesters/HarvestersScreen';
import { HarvestFormScreen } from '@/screens/harvests/HarvestFormScreen';
import { HarvestsScreen } from '@/screens/harvests/HarvestsScreen';
import { AttendanceScreen } from '@/screens/labour/AttendanceScreen';
import { LabourFormScreen } from '@/screens/labour/LabourFormScreen';
import { LabourLedgerScreen } from '@/screens/labour/LabourLedgerScreen';
import { LabourScreen } from '@/screens/labour/LabourScreen';
import { EditProfileScreen } from '@/screens/more/EditProfileScreen';
import { MoreMenuScreen } from '@/screens/more/MoreMenuScreen';
import { ReportBugScreen } from '@/screens/more/ReportBugScreen';
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

function useScreenOptions() {
  const insets = useSafeAreaInsets();
  // On Android the safe-area inset is 0 on the first render after a reload (it
  // re-measures only after a layout pass), so the header overlaps the status
  // bar until you background/foreground the app. StatusBar.currentHeight is
  // available synchronously, so use the larger of the two. (No-op on iOS.)
  const androidStatusBar = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  return {
    headerStyle: { backgroundColor: colors.primary },
    headerTintColor: colors.white,
    headerTitleStyle: { fontWeight: '600' as const },
    contentStyle: { backgroundColor: colors.background },
    headerStatusBarHeight: Math.max(insets.top, androidStatusBar),
  };
}

const Dashboard = createNativeStackNavigator<DashboardStackParamList>();
export function DashboardStack() {
  const { t } = useTranslation();
  const screenOptions = useScreenOptions();
  return (
    <Dashboard.Navigator screenOptions={screenOptions}>
      <Dashboard.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('tabs.dashboard') }} />
    </Dashboard.Navigator>
  );
}

const Harvests = createNativeStackNavigator<HarvestsStackParamList>();
export function HarvestsStack() {
  const { t } = useTranslation();
  const screenOptions = useScreenOptions();
  return (
    <Harvests.Navigator screenOptions={screenOptions}>
      <Harvests.Screen name="HarvestsList" component={HarvestsScreen} options={{ title: t('nav.harvestingJobs') }} />
      <Harvests.Screen name="HarvestForm" component={HarvestFormScreen} options={{ title: t('nav.newJob') }} />
    </Harvests.Navigator>
  );
}

const Customers = createNativeStackNavigator<CustomersStackParamList>();
export function CustomersStack() {
  const { t } = useTranslation();
  const screenOptions = useScreenOptions();
  return (
    <Customers.Navigator screenOptions={screenOptions}>
      <Customers.Screen name="CustomersList" component={CustomersScreen} options={{ title: t('nav.customers') }} />
      <Customers.Screen
        name="CustomerLedger"
        component={CustomerLedgerScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <Customers.Screen name="CustomerForm" component={CustomerFormScreen} options={{ title: t('nav.addCustomer') }} />
      <Customers.Screen name="HarvestForm" component={HarvestFormScreen} options={{ title: t('nav.newJob') }} />
    </Customers.Navigator>
  );
}

const Expenses = createNativeStackNavigator<ExpensesStackParamList>();
export function ExpensesStack() {
  const { t } = useTranslation();
  const screenOptions = useScreenOptions();
  return (
    <Expenses.Navigator screenOptions={screenOptions}>
      <Expenses.Screen name="ExpensesList" component={ExpensesScreen} options={{ title: t('nav.expenses') }} />
      <Expenses.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: t('nav.addExpense') }} />
    </Expenses.Navigator>
  );
}

const More = createNativeStackNavigator<MoreStackParamList>();
export function MoreStack() {
  const { t } = useTranslation();
  const screenOptions = useScreenOptions();
  return (
    <More.Navigator screenOptions={screenOptions}>
      <More.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: t('nav.more') }} />
      <More.Screen name="Harvesters" component={HarvestersScreen} options={{ title: t('nav.harvesters') }} />
      <More.Screen name="HarvesterForm" component={HarvesterFormScreen} options={{ title: t('nav.addHarvester') }} />
      <More.Screen name="Labour" component={LabourScreen} options={{ title: t('nav.labour') }} />
      <More.Screen name="LabourForm" component={LabourFormScreen} options={{ title: t('nav.addLabour') }} />
      <More.Screen
        name="LabourLedger"
        component={LabourLedgerScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <More.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={({ route }) => ({ title: t('nav.attendance', { name: route.params.name }) })}
      />
      <More.Screen name="Agents" component={AgentsScreen} options={{ title: t('nav.agents') }} />
      <More.Screen name="AgentForm" component={AgentFormScreen} options={{ title: t('nav.addAgent') }} />
      <More.Screen
        name="AgentLedger"
        component={AgentLedgerScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <More.Screen name="Admins" component={AdminsScreen} options={{ title: t('nav.staffAdmins') }} />
      <More.Screen name="AdminForm" component={AdminFormScreen} options={{ title: t('nav.addAdmin') }} />
      <More.Screen
        name="ExpenseCategories"
        component={ExpenseCategoriesScreen}
        options={{ title: t('nav.expenseCategories') }}
      />
      <More.Screen
        name="ExpenseCategoryForm"
        component={ExpenseCategoryFormScreen}
        options={{ title: t('nav.addExpenseCategory') }}
      />
      <More.Screen name="FuelPumps" component={FuelPumpsScreen} options={{ title: t('nav.fuelPumps') }} />
      <More.Screen name="FuelPumpForm" component={FuelPumpFormScreen} options={{ title: t('nav.addFuelPump') }} />
      <More.Screen
        name="FuelPumpLedger"
        component={FuelPumpLedgerScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
      <More.Screen name="Reports" component={ReportsScreen} options={{ title: t('nav.reports') }} />
      <More.Screen name="ReportBug" component={ReportBugScreen} options={{ title: t('nav.reportBug') }} />
      <More.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t('nav.editProfile') }}
      />
      <More.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
    </More.Navigator>
  );
}
