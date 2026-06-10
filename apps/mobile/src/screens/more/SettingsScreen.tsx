import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AreaUnit, Role } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { maintenanceApi, settingsApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { Loading } from '@/components/States';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';
import { labelFromEnum } from '@/utils/format';

const UNIT_OPTIONS = Object.values(AreaUnit).map((u) => ({ label: labelFromEnum(u), value: u }));
const CURRENCY_OPTIONS = [
  { label: 'Indian Rupee (₹)', value: 'INR' },
  { label: 'US Dollar ($)', value: 'USD' },
];

export function SettingsScreen() {
  const qc = useQueryClient();
  const isSuperAdmin = useAuth((s) => s.admin?.role) === Role.SUPER_ADMIN;
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const [currency, setCurrency] = useState('INR');
  const [unit, setUnit] = useState<AreaUnit>(AreaUnit.BIGHA);

  useEffect(() => {
    if (data) {
      setCurrency(data.currency);
      setUnit(data.defaultAreaUnit);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => settingsApi.update({ currency, defaultAreaUnit: unit }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert('Saved', 'Settings updated.');
    },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const clearData = useMutation({
    mutationFn: () => maintenanceApi.clearData(),
    onSuccess: (res) => {
      qc.invalidateQueries();
      const total = Object.values(res.deleted).reduce((a, b) => a + b, 0);
      Alert.alert('Data cleared', `Removed ${total} records. Your account and admins are kept.`);
    },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const confirmClear = () =>
    Alert.alert(
      'Clear all data?',
      'This permanently deletes ALL harvesters, customers, jobs, expenses, labour and payments for your account. Admin accounts are kept. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear all data', style: 'destructive', onPress: () => clearData.mutate() },
      ],
    );

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <Select label="Currency" value={currency} options={CURRENCY_OPTIONS} onChange={setCurrency} />
      <Select
        label="Default area unit"
        value={unit}
        options={UNIT_OPTIONS}
        onChange={(v) => setUnit(v as AreaUnit)}
      />
      <Text style={styles.hint}>
        Harvesting rates are set per harvester (More → Harvesters). The area unit you pick here is
        used in the rate labels and on new jobs.
      </Text>
      <Button title="Save settings" onPress={() => save.mutate()} loading={save.isPending} style={{ marginTop: spacing.sm }} />

      {isSuperAdmin ? (
        <View style={styles.danger}>
          <Text style={styles.dangerTitle}>Danger zone</Text>
          <Text style={styles.hint}>
            Permanently delete all business data for your account. Admin accounts are not affected.
          </Text>
          <Button
            title="Clear all data"
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
