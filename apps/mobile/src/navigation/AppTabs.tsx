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
