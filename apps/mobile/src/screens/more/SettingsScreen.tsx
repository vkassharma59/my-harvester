import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
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

const CURRENCY_OPTIONS = [
  { label: 'Indian Rupee (₹)', value: 'INR' },
  { label: 'US Dollar ($)', value: 'USD' },
];
const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ label: l.label, value: l.code }));

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
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

  useEffect(() => {
    if (data) {
      setCurrency(data.currency);
      setUnit(data.defaultAreaUnit);
      setFirmName(data.firmName || defaultFirm);
    }
  }, [data, defaultFirm]);

  const save = useMutation({
    mutationFn: () => settingsApi.update({ currency, defaultAreaUnit: unit, firmName: firmName.trim() }),
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

  const confirmClear = () =>
    Alert.alert(t('settings.clearConfirmTitle'), t('settings.clearConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.clearData'), style: 'destructive', onPress: () => clearData.mutate() },
    ]);

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <Select
        label={t('settings.language')}
        value={i18n.language}
        options={LANGUAGE_OPTIONS}
        onChange={(v) => void setLanguage(v as LanguageCode)}
      />
      <TextField
        label={t('settings.firmName')}
        value={firmName}
        onChangeText={setFirmName}
        placeholder={t('settings.firmNamePlaceholder')}
      />
      <Select label={t('settings.currency')} value={currency} options={CURRENCY_OPTIONS} onChange={setCurrency} />
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
        <View style={styles.danger}>
          <Text style={styles.dangerTitle}>{t('settings.dangerZone')}</Text>
          <Text style={styles.hint}>{t('settings.dangerHint')}</Text>
          <Button
            title={t('settings.clearData')}
            variant="danger"
            onPress={confirmClear}
            loading={clearData.isPending}
          />
        </View>
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
});
