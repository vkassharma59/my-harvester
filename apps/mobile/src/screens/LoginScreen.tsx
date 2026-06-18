import { Ionicons } from '@expo/vector-icons';
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
import { colors, font, radius, spacing } from '@/theme';

export function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const login = useAuth((s) => s.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which fields to highlight in red after a failed attempt.
  const [invalid, setInvalid] = useState({ id: false, pw: false });
  const [loading, setLoading] = useState(false);

  // Any edit clears the error state so the red borders / banner don't linger.
  const clearError = () => {
    if (error) {
      setError(null);
      setInvalid({ id: false, pw: false });
    }
  };

  const onSubmit = async () => {
    setError(null);
    const idEmpty = !identifier.trim();
    const pwEmpty = !password;
    if (idEmpty || pwEmpty) {
      setInvalid({ id: idEmpty, pw: pwEmpty });
      setError(t('login.missingCredentials'));
      return;
    }
    setInvalid({ id: false, pw: false });
    setLoading(true);
    try {
      const result = await authApi.login(identifier.trim(), password);
      await login(result.accessToken, result.admin, rememberMe);
    } catch (e) {
      setInvalid({ id: true, pw: true });
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
        onChangeText={(v) => {
          setIdentifier(v);
          clearError();
        }}
        invalid={invalid.id}
        autoCapitalize="none"
        autoComplete="username"
        placeholder={t('login.identifierPlaceholder')}
      />
      <TextField
        label={t('login.passwordLabel')}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          clearError();
        }}
        invalid={invalid.pw}
        secureTextEntry
        placeholder="••••••••"
        onSubmitEditing={onSubmit}
      />

      <View style={styles.optionsRow}>
        <Pressable
          style={styles.remember}
          onPress={() => setRememberMe((v) => !v)}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberMe }}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
            {rememberMe ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
          </View>
          <Text style={styles.rememberText}>{t('login.rememberMe')}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
          <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Button title={t('login.signIn')} onPress={onSubmit} loading={loading} />

      <View style={styles.requestRow}>
        <Text style={styles.requestPrompt}>{t('login.noAccount')}</Text>
        <Pressable onPress={() => navigation.navigate('RequestAccount')} hitSlop={8}>
          <Text style={styles.requestLink}>{t('login.requestAccount')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xl },
  logo: { fontSize: 56 },
  title: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.primary, marginTop: spacing.sm },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: spacing.xs },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  remember: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberText: { color: colors.text, fontSize: font.size.sm },
  forgotText: { color: colors.primary, fontSize: font.size.sm, fontWeight: font.weight.semibold },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE9E9',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  errorIcon: { marginRight: spacing.sm },
  errorText: { color: colors.danger, fontSize: font.size.sm, flex: 1, lineHeight: 19 },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  requestPrompt: { color: colors.textMuted, fontSize: font.size.sm },
  requestLink: { color: colors.primary, fontSize: font.size.sm, fontWeight: font.weight.bold },
});
