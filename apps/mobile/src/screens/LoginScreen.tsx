import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/store/auth';
import { colors, font, spacing } from '@/theme';

export function LoginScreen() {
  const login = useAuth((s) => s.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Enter your email / mobile and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.login(identifier.trim(), password);
      await login(result.accessToken, result.admin);
    } catch (e) {
      setError(apiErrorMessage(e, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.logo}>🌾</Text>
        <Text style={styles.title}>Wheat Harvester</Text>
        <Text style={styles.subtitle}>Owner / Admin sign in</Text>
      </View>

      <TextField
        label="Email or mobile number"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        autoComplete="username"
        placeholder="you@example.com or 9876543210"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        onSubmitEditing={onSubmit}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Sign in" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />
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
