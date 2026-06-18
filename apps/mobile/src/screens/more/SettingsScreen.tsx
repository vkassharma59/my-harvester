import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AreaUnit, Role } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { harvestersApi, maintenanceApi, settingsApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { useOfflinePrefs } from '@/offline/prefs';
import { LANGUAGES, LanguageCode, setLanguage, tEnum } from '@/i18n';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ label: l.label, value: l.code }));

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const isSuperAdmin = useAuth((s) => s.admin?.role) === Role.OWNER;
  const myHarvesterIds = useAuth((s) => s.admin?.harvesterIds) ?? [];
  const offlineEntryEnabled = useOfflinePrefs((s) => s.offlineEntryEnabled);
  const setOfflineEntryEnabled = useOfflinePrefs((s) => s.setOfflineEntryEnabled);
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const { data: harvesters = [] } = useQuery({
    queryKey: ['harvesters', 'all'],
    queryFn: () => harvestersApi.list(),
  });

  const unitOptions = Object.values(AreaUnit).map((u) => ({ label: tEnum('areaUnit', u), value: u }));
  // Firm name defaults to the staff admin's harvester name; empty for the owner.
  const defaultFirm = isSuperAdmin ? '' : harvesters.find((h) => myHarvesterIds.includes(h.id))?.name ?? '';

  const [currency, setCurrency] = useState('INR');
  const [unit, setUnit] = useState<AreaUnit>(AreaUnit.BIGHA);
  const [firmName, setFirmName] = useState('');
  // Language is staged locally and only applied when Save is pressed.
  const [language, setLanguageChoice] = useState<LanguageCode>(i18n.language as LanguageCode);
  // OTP gate for the destructive clear-all-data action.
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (data) {
      setCurrency(data.currency);
      setUnit(data.defaultAreaUnit);
      setFirmName(data.firmName || defaultFirm);
    }
  }, [data, defaultFirm]);

  const save = useMutation({
    mutationFn: async () => {
      if (language !== i18n.language) await setLanguage(language);
      return settingsApi.update({ currency, defaultAreaUnit: unit, firmName: firmName.trim() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert(t('common.saved'), t('settings.savedBody'));
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const clearData = useMutation({
    mutationFn: () => maintenanceApi.clearData(),
    onSuccess: (res) => {
      qc.invalidateQueries();
      const total = Object.values(res.deleted).reduce((a, b) => a + b, 0);
      Alert.alert(t('settings.dataCleared'), t('settings.dataClearedBody', { count: total }));
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const openOtp = () => {
    setOtp('');
    setOtpOpen(true);
  };
  const closeOtp = () => {
    setOtpOpen(false);
    setOtp('');
  };
  const verifyAndClear = () => {
    // No SMS provider yet — accept any 6-digit code, but enforce the format.
    if (!/^\d{6}$/.test(otp)) {
      Alert.alert(t('settings.otpInvalidTitle'), t('settings.otpInvalidBody'));
      return;
    }
    setOtpOpen(false);
    setOtp('');
    clearData.mutate();
  };

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <Select
        label={t('settings.language')}
        value={language}
        options={LANGUAGE_OPTIONS}
        onChange={(v) => setLanguageChoice(v as LanguageCode)}
      />
      <TextField
        label={t('settings.firmName')}
        value={firmName}
        onChangeText={setFirmName}
        placeholder={t('settings.firmNamePlaceholder')}
      />
      <Select
        label={t('settings.defaultAreaUnit')}
        value={unit}
        options={unitOptions}
        onChange={(v) => setUnit(v as AreaUnit)}
      />
      <Text style={styles.hint}>{t('settings.rateHint')}</Text>
      <Button title={t('settings.save')} onPress={() => save.mutate()} loading={save.isPending} style={{ marginTop: spacing.sm }} />

      <View style={styles.toggleCard}>
        <View style={styles.toggleText}>
          <Text style={styles.toggleLabel}>{t('settings.offlineEntry')}</Text>
          <Text style={styles.toggleHint}>{t('settings.offlineEntryHint')}</Text>
        </View>
        <Switch
          value={offlineEntryEnabled}
          onValueChange={setOfflineEntryEnabled}
          trackColor={{ true: colors.primaryLight, false: colors.border }}
          thumbColor={offlineEntryEnabled ? colors.primary : colors.surface}
        />
      </View>

      {isSuperAdmin ? (
        <>
          <View style={styles.danger}>
            <Text style={styles.dangerTitle}>{t('settings.dangerZone')}</Text>
            <Text style={styles.hint}>{t('settings.dangerHint')}</Text>
            <Button
              title={t('settings.clearData')}
              variant="danger"
              onPress={openOtp}
              loading={clearData.isPending}
            />
          </View>

          <Modal visible={otpOpen} transparent animationType="slide" onRequestClose={closeOtp}>
            <KeyboardAvoidingView style={styles.modalRoot} behavior="padding">
              <Pressable style={styles.backdrop} onPress={closeOtp} />
              <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
                <Text style={styles.sheetTitle}>{t('settings.otpTitle')}</Text>
                <Text style={styles.hint}>{t('settings.otpSent')}</Text>
                <TextField
                  label={t('settings.otpLabel')}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder={t('settings.otpPlaceholder')}
                />
                <Text style={styles.otpNote}>{t('settings.otpDevNote')}</Text>
                <Button
                  title={t('settings.otpVerifyClear')}
                  variant="danger"
                  onPress={verifyAndClear}
                  loading={clearData.isPending}
                />
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: font.size.xs, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 18 },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  toggleText: { flex: 1, marginRight: spacing.md },
  toggleLabel: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  toggleHint: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 18 },
  danger: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#F3C2C2',
    borderRadius: radius.md,
    backgroundColor: '#FDF4F4',
  },
  dangerTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
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
