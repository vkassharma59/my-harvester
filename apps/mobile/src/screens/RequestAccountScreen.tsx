import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { accountRequestsApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { RootStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestAccount'>;

// "How many harvesters are you going to manage?" — 1–5, then "more than 5".
const HARVESTER_COUNT_OPTIONS = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: 'More than 5', value: '6' },
];

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function RequestAccountScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [harvesterCount, setHarvesterCount] = useState('1');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      accountRequestsApi.create({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile,
        harvesterCount: Number(harvesterCount),
        password,
      }),
    onSuccess: () => {
      Alert.alert(t('requestAccount.submittedTitle'), t('requestAccount.submittedBody'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const onSubmit = () => {
    setError(null);
    if (!fullName.trim()) return setError(t('requestAccount.errName'));
    if (!isEmail(email.trim())) return setError(t('requestAccount.errEmail'));
    if (!/^\d{10}$/.test(mobile)) return setError(t('requestAccount.errMobile'));
    if (password.length < 6) return setError(t('requestAccount.errPassword'));
    if (password !== confirm) return setError(t('requestAccount.errMismatch'));
    submit.mutate();
  };

  return (
    <Screen>
      <View style={styles.note}>
        <Text style={styles.noteText}>{t('requestAccount.note')}</Text>
      </View>

      <TextField
        label={t('requestAccount.fullName')}
        value={fullName}
        onChangeText={setFullName}
        placeholder={t('requestAccount.fullNamePlaceholder')}
      />
      <TextField
        label={t('requestAccount.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder={t('requestAccount.emailPlaceholder')}
      />
      <TextField
        label={t('requestAccount.mobile')}
        value={mobile}
        onChangeText={(v) => setMobile(v.replace(/[^0-9]/g, '').slice(0, 10))}
        keyboardType="number-pad"
        maxLength={10}
        placeholder={t('requestAccount.mobilePlaceholder')}
      />
      <Select
        label={t('requestAccount.harvesterCount')}
        value={harvesterCount}
        options={HARVESTER_COUNT_OPTIONS}
        onChange={setHarvesterCount}
      />
      <TextField
        label={t('requestAccount.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      <TextField
        label={t('requestAccount.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="••••••••"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={t('requestAccount.submit')}
        onPress={onSubmit}
        loading={submit.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteText: { fontSize: font.size.sm, color: colors.primary, lineHeight: 19 },
  error: { color: colors.danger, marginTop: spacing.sm },
});
