import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { HarvesterStatus, HarvesterType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { tEnum } from '@/i18n';
import { harvestersApi, HarvesterInput, settingsApi } from '@/api/endpoints';
import { AmountField } from '@/components/AmountField';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { MoreStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'HarvesterForm'>;

type FormState = HarvesterInput;

export function HarvesterFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const TYPE_OPTIONS = [
    { label: tEnum('harvesterType', HarvesterType.COMBINE), value: HarvesterType.COMBINE },
    { label: tEnum('harvesterType', HarvesterType.BHUSA), value: HarvesterType.BHUSA },
  ];
  const qc = useQueryClient();
  const harvesterId = route.params?.harvesterId;
  const editing = !!harvesterId;

  // Unit label (Bigha/Acre) for the rate fields comes from settings.
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const unit = tEnum('areaUnit', settings?.defaultAreaUnit ?? 'BIGHA');

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
    navigation.setOptions({ title: editing ? t('harvesterForm.titleEdit') : t('harvesterForm.titleAdd') });
  }, [editing, navigation, t]);

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
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
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
      Alert.alert(t('common.error'), apiErrorMessage(e));
    },
  });

  const onSave = () => {
    if (!form.name.trim()) {
      Alert.alert(t('harvesterForm.required'), t('harvesterForm.requiredName'));
      return;
    }
    save.mutate();
  };

  const isActive = status === HarvesterStatus.ACTIVE;

  return (
    <Screen>
      <TextField
        label={t('harvesterForm.name')}
        value={form.name}
        onChangeText={(name) => setForm((f) => ({ ...f, name }))}
        placeholder={t('harvesterForm.namePlaceholder')}
      />
      <Select
        label={t('harvesterForm.harvesterType')}
        value={form.type}
        options={TYPE_OPTIONS}
        onChange={(v) => setForm((f) => ({ ...f, type: v as HarvesterType }))}
      />

      {isBhusa ? (
        <>
          <AmountField
            label={t('harvesterForm.rateWithBhusa', { unit })}
            value={rateWithBhusa}
            onChangeText={setRateWithBhusa}
            placeholder="0"
          />
          <AmountField
            label={t('harvesterForm.rateWithoutBhusa', { unit })}
            value={rateWithoutBhusa}
            onChangeText={setRateWithoutBhusa}
            placeholder="0"
          />
        </>
      ) : (
        <AmountField
          label={t('harvesterForm.ratePerUnit', { unit })}
          value={ratePerUnit}
          onChangeText={setRatePerUnit}
          placeholder="0"
        />
      )}

      <TextField
        label={t('harvesterForm.registrationNo')}
        value={form.registrationNo}
        onChangeText={(v) => setForm((f) => ({ ...f, registrationNo: v.toUpperCase() }))}
        autoCapitalize="characters"
        placeholder={t('harvesterForm.registrationPlaceholder')}
      />
      <TextField
        label={t('harvesterForm.model')}
        value={form.model}
        onChangeText={(model) => setForm((f) => ({ ...f, model }))}
      />
      <TextField
        label={t('harvesterForm.notes')}
        value={form.notes}
        onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
        multiline
      />

      {editing ? (
        <View style={styles.statusCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>{t('harvesterForm.status')}</Text>
            <Text style={[styles.statusValue, isActive ? styles.activeText : styles.inactiveText]}>
              {isActive ? t('harvesterForm.active') : t('harvesterForm.inactive')}
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
        title={editing ? t('harvesterForm.saveChanges') : t('harvesterForm.addHarvester')}
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
