import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INDIAN_STATES, districtsForState } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { accountRequestsApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Select, type SelectOption } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { RootStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

const toOptions = (values: string[]): SelectOption[] => values.map((v) => ({ label: v, value: v }));
const STATE_OPTIONS = toOptions(INDIAN_STATES);

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
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [harvesterCount, setHarvesterCount] = useState('1');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [password, setPassword] = useState('');

  const districtOptions = useMemo(() => toOptions(districtsForState(state)), [state]);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  // OTP gate: the request is only raised after the mobile number is "verified".
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      accountRequestsApi.create({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile,
        harvesterCount: Number(harvesterCount),
        state,
        district,
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
    if (!state) return setError(t('requestAccount.errState'));
    if (!district) return setError(t('requestAccount.errDistrict'));
    if (password.length < 6) return setError(t('requestAccount.errPassword'));
    if (password !== confirm) return setError(t('requestAccount.errMismatch'));
    // Fields are valid — gate the request behind mobile OTP verification.
    setOtp('');
    setOtpOpen(true);
  };

  const closeOtp = () => {
    setOtpOpen(false);
    setOtp('');
  };

  const verifyAndSubmit = () => {
    // No SMS provider yet — accept any 6-digit code, but enforce the format.
    if (!/^\d{6}$/.test(otp)) {
      Alert.alert(t('requestAccount.otpInvalidTitle'), t('requestAccount.otpInvalidBody'));
      return;
    }
    setOtpOpen(false);
    setOtp('');
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
      <Select
        label={t('requestAccount.state')}
        value={state || undefined}
        options={STATE_OPTIONS}
        placeholder={t('requestAccount.statePlaceholder')}
        searchable
        searchPlaceholder={t('requestAccount.searchState')}
        onChange={(v) => {
          setState(v);
          setDistrict(''); // districts depend on the state — clear the stale pick
        }}
      />
      <Select
        label={t('requestAccount.district')}
        value={district || undefined}
        options={districtOptions}
        placeholder={
          state ? t('requestAccount.districtPlaceholder') : t('requestAccount.districtSelectStateFirst')
        }
        searchable
        searchPlaceholder={t('requestAccount.searchDistrict')}
        emptyText={t('requestAccount.districtSelectStateFirst')}
        onChange={setDistrict}
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

      <Modal visible={otpOpen} transparent animationType="slide" onRequestClose={closeOtp}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior="padding">
          <Pressable style={styles.backdrop} onPress={closeOtp} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <Text style={styles.sheetTitle}>{t('requestAccount.otpTitle')}</Text>
            <Text style={styles.hint}>{t('requestAccount.otpSent', { mobile })}</Text>
            <TextField
              label={t('requestAccount.otpLabel')}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder={t('requestAccount.otpPlaceholder')}
            />
            <Text style={styles.otpNote}>{t('requestAccount.otpDevNote')}</Text>
            <Button
              title={t('requestAccount.otpVerify')}
              onPress={verifyAndSubmit}
              loading={submit.isPending}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  hint: { fontSize: font.size.xs, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 18 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  otpNote: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
});
