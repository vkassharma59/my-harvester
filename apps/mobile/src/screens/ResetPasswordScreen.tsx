import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { RootStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { identifier } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onReset = () => {
    if (!code.trim() || !password || !confirm) {
      setError(t('resetPassword.required'));
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError(t('resetPassword.invalidCode'));
      return;
    }
    if (password.length < 6) {
      setError(t('resetPassword.weakPassword'));
      return;
    }
    if (password !== confirm) {
      setError(t('resetPassword.mismatch'));
      return;
    }
    setError(null);
    // The OTP backend isn't built yet — this is the completed UI for it.
    Alert.alert(t('resetPassword.comingSoonTitle'), t('resetPassword.comingSoon'), [
      { text: 'OK', onPress: () => navigation.popToTop() },
    ]);
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('resetPassword.title')}</Text>
      <Text style={styles.subtitle}>{t('resetPassword.subtitle', { identifier })}</Text>
      <TextField
        label={t('resetPassword.codeLabel')}
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        placeholder={t('resetPassword.codePlaceholder')}
      />
      <TextField
        label={t('resetPassword.newPasswordLabel')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      <TextField
        label={t('resetPassword.confirmLabel')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="••••••••"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={t('resetPassword.reset')} onPress={onReset} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text, marginTop: spacing.lg },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  error: { color: colors.danger, marginVertical: spacing.sm },
});
