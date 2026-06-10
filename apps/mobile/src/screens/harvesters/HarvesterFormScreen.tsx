import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { HarvesterStatus, HarvesterType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { harvestersApi, HarvesterInput, settingsApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { MoreStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { labelFromEnum } from '@/utils/format';

type Props = NativeStackScreenProps<MoreStackParamList, 'HarvesterForm'>;

const TYPE_OPTIONS = [
  { label: 'Combine Harvester', value: HarvesterType.COMBINE },
  { label: 'Bhusa Harvester', value: HarvesterType.BHUSA },
];

type FormState = HarvesterInput;

export function HarvesterFormScreen({ route, navigation }: Props) {
  const qc = useQueryClient();
  const harvesterId = route.params?.harvesterId;
  const editing = !!harvesterId;

  // Unit label (Bigha/Acre) for the rate fields comes from settings.
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const unit = labelFromEnum(settings?.defaultAreaUnit ?? 'BIGHA');

  const [form, setForm] = useState<FormState>({
    name: '',
    registrationNo: '',
    model: '',
    notes: '',
    type: HarvesterType.COMBINE,
  });
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [rateWithBhusa, setRateWithBhusa] = useState('');
  const [rateWithoutBhusa, setRateWithoutBhusa] = useState('');
  const [status, setStatus] = useState<HarvesterStatus>(HarvesterStatus.ACTIVE);

  const isBhusa = form.type === HarvesterType.BHUSA;

  const { data: existing } = useQuery({
    queryKey: ['harvesters', harvesterId],
    queryFn: () => harvestersApi.list().then((list) => list.find((h) => h.id === harvesterId)),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit harvester' : 'Add harvester' });
  }, [editing, navigation]);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        registrationNo: existing.registrationNo ?? '',
        model: existing.model ?? '',
        notes: existing.notes ?? '',
        type: existing.type,
      });
      setRatePerUnit(existing.ratePerUnit != null ? String(existing.ratePerUnit) : '');
      setRateWithBhusa(existing.rateWithBhusa != null ? String(existing.rateWithBhusa) : '');
      setRateWithoutBhusa(
        existing.rateWithoutBhusa != null ? String(existing.rateWithoutBhusa) : '',
      );
      setStatus(existing.status);
    }
  }, [existing]);

  const buildBody = (): HarvesterInput => {
    const base: HarvesterInput = {
      name: form.name,
      registrationNo: form.registrationNo || undefined,
      model: form.model || undefined,
      notes: form.notes || undefined,
      type: form.type,
    };
    if (form.type === HarvesterType.COMBINE) {
      base.ratePerUnit = ratePerUnit ? Number(ratePerUnit) : undefined;
    } else {
      base.rateWithBhusa = rateWithBhusa ? Number(rateWithBhusa) : undefined;
      base.rateWithoutBhusa = rateWithoutBhusa ? Number(rateWithoutBhusa) : undefined;
    }
    return base;
  };

  const save = useMutation({
    mutationFn: () =>
      editing ? harvestersApi.update(harvesterId, buildBody()) : harvestersApi.create(buildBody()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvesters'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const toggleStatus = useMutation({
    mutationFn: (next: HarvesterStatus) =>
      next === HarvesterStatus.ACTIVE
        ? harvestersApi.activate(harvesterId as string)
        : harvestersApi.deactivate(harvesterId as string),
    onMutate: (next) => setStatus(next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['harvesters'] }),
    onError: (e) => {
      setStatus((s) => (s === HarvesterStatus.ACTIVE ? HarvesterStatus.INACTIVE : HarvesterStatus.ACTIVE));
      Alert.alert('Error', apiErrorMessage(e));
    },
  });

  const onSave = () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Harvester name is required.');
      return;
    }
    save.mutate();
  };

  const isActive = status === HarvesterStatus.ACTIVE;

  return (
    <Screen>
      <TextField
        label="Name *"
        value={form.name}
        onChangeText={(name) => setForm((f) => ({ ...f, name }))}
        placeholder="Harvester 1"
      />
      <Select
        label="Harvester type *"
        value={form.type}
        options={TYPE_OPTIONS}
        onChange={(v) => setForm((f) => ({ ...f, type: v as HarvesterType }))}
      />

      {isBhusa ? (
        <>
          <TextField
            label={`Default Rate Per ${unit} (With Bhusa)`}
            value={rateWithBhusa}
            onChangeText={setRateWithBhusa}
            keyboardType="numeric"
            placeholder="0"
          />
          <TextField
            label={`Default Rate Per ${unit} (Without Bhusa)`}
            value={rateWithoutBhusa}
            onChangeText={setRateWithoutBhusa}
            keyboardType="numeric"
            placeholder="0"
          />
        </>
      ) : (
        <TextField
          label={`Default Rate Per ${unit}`}
          value={ratePerUnit}
          onChangeText={setRatePerUnit}
          keyboardType="numeric"
          placeholder="0"
        />
      )}

      <TextField
        label="Registration No."
        value={form.registrationNo}
        onChangeText={(v) => setForm((f) => ({ ...f, registrationNo: v.toUpperCase() }))}
        autoCapitalize="characters"
        placeholder="RJ-01-AB-1234"
      />
      <TextField
        label="Model"
        value={form.model}
        onChangeText={(model) => setForm((f) => ({ ...f, model }))}
      />
      <TextField
        label="Notes"
        value={form.notes}
        onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
        multiline
      />

      {editing ? (
        <View style={styles.statusCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={[styles.statusValue, isActive ? styles.activeText : styles.inactiveText]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Switch
            value={isActive}
            disabled={toggleStatus.isPending}
            onValueChange={(on) =>
              toggleStatus.mutate(on ? HarvesterStatus.ACTIVE : HarvesterStatus.INACTIVE)
            }
            trackColor={{ true: colors.primaryLight, false: colors.border }}
            thumbColor={isActive ? colors.primary : colors.surface}
          />
        </View>
      ) : null}

      <Button
        title={editing ? 'Save changes' : 'Add harvester'}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusLabel: { fontSize: font.size.sm, color: colors.textMuted, marginBottom: 2 },
  statusValue: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  activeText: { color: colors.success },
  inactiveText: { color: colors.danger },
});
