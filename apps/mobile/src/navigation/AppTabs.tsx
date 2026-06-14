import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, font } from '@/theme';
import { CustomersStack, DashboardStack, ExpensesStack, HarvestsStack, MoreStack } from './stacks';
import { AppTabsParamList } from './types';

const Tab = createBottomTabNavigator<AppTabsParamList>();

const icons: Record<keyof AppTabsParamList, string> = {
  DashboardTab: '🏠',
  HarvestsTab: '🌾',
  CustomersTab: '👥',
  ExpensesTab: '💰',
  MoreTab: '☰',
};

// The root (first) screen of each tab's stack — where a tab press should land.
const TAB_ROOT: Record<keyof AppTabsParamList, string> = {
  DashboardTab: 'Dashboard',
  HarvestsTab: 'HarvestsList',
  CustomersTab: 'CustomersList',
  ExpensesTab: 'ExpensesList',
  MoreTab: 'MoreMenu',
};

function tabIcon(name: keyof AppTabsParamList) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[name]}</Text>
  );
}

export function AppTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: font.size.xs },
      }}
      // Tapping any tab lands on that tab's main page rather than a screen the
      // user left open mid-edit: jump straight to the stack's root screen.
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          e.preventDefault();
          navigation.navigate(route.name, { screen: TAB_ROOT[route.name as keyof AppTabsParamList] });
        },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{ title: t('tabs.dashboard'), tabBarIcon: tabIcon('DashboardTab') }}
      />
      <Tab.Screen
        name="HarvestsTab"
        component={HarvestsStack}
        options={{ title: t('tabs.harvests'), tabBarIcon: tabIcon('HarvestsTab') }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersStack}
        options={{ title: t('tabs.customers'), tabBarIcon: tabIcon('CustomersTab') }}
      />
      <Tab.Screen
        name="ExpensesTab"
        component={ExpensesStack}
        options={{ title: t('tabs.expenses'), tabBarIcon: tabIcon('ExpensesTab') }}
      />
      <Tab.Screen name="MoreTab" component={MoreStack} options={{ title: t('tabs.more'), tabBarIcon: tabIcon('MoreTab') }} />
    </Tab.Navigator>
  );
}
