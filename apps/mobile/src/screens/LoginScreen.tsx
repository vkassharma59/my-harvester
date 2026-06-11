import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/store/auth';
import { colors, font, spacing } from '@/theme';

export function LoginScreen() {
  const { t } = useTranslation();
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
    <Screen>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xl },
  logo: { fontSize: 56 },
  title: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.primary, marginTop: spacing.sm },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.sm, textAlign: 'center' },
});
