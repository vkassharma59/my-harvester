import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { RootStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSend = () => {
    if (!identifier.trim()) {
      setError(t('forgotPassword.required'));
      return;
    }
    setError(null);
    // OTP delivery isn't wired up yet — continue to the reset-code UI.
    navigation.navigate('ResetPassword', { identifier: identifier.trim() });
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('forgotPassword.title')}</Text>
      <Text style={styles.subtitle}>{t('forgotPassword.subtitle')}</Text>
      <TextField
        label={t('forgotPassword.identifierLabel')}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        placeholder={t('forgotPassword.identifierPlaceholder')}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={t('forgotPassword.sendCode')} onPress={onSend} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text, marginTop: spacing.lg },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  error: { color: colors.danger, marginVertical: spacing.sm },
});
