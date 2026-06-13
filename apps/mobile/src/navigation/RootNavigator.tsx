import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Loading } from '@/components/States';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { ResetPasswordScreen } from '@/screens/ResetPasswordScreen';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';
import { RootStackParamList } from './types';
import { AppTabs } from './AppTabs';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { t } = useTranslation();
  const { token, bootstrapping, restore } = useAuth();

  useEffect(() => {
    void restore();
  }, [restore]);

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Loading label={t('common.starting')} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <RootStack.Screen name="App" component={AppTabs} />
      ) : (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: true, title: t('forgotPassword.title') }}
          />
          <RootStack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: true, title: t('resetPassword.title') }}
          />
        </>
      )}
    </RootStack.Navigator>
  );
}
