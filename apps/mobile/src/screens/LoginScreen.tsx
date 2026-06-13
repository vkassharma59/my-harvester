import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/store/auth';
import { colors, font, spacing } from '@/theme';

export function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const login = useAuth((s) => s.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!identifier.trim() || !password) {
      setError(t('login.missingCredentials'));
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.login(identifier.trim(), password);
      await login(result.accessToken, result.admin);
    } catch (e) {
      setError(apiErrorMessage(e, t('login.loginFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.centered}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌾</Text>
        <Text style={styles.title}>{t('login.title')}</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
      </View>

      <TextField
        label={t('login.identifierLabel')}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoComplete="username"
        placeholder={t('login.identifierPlaceholder')}
      />
      <TextField
        label={t('login.passwordLabel')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        onSubmitEditing={onSubmit}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title={t('login.signIn')} onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

      <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8} style={styles.forgot}>
        <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 56 },
  title: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.primary, marginTop: spacing.sm },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.sm, textAlign: 'center' },
  forgot: { alignSelf: 'center', marginTop: spacing.lg },
  forgotText: { color: colors.primary, fontSize: font.size.sm, fontWeight: font.weight.semibold },
});
