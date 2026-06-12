import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { HarvesterStatus } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { fuelPumpsApi, harvestersApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { MoreStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'FuelPumpForm'>;

export function FuelPumpFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const pumpId = route.params?.pumpId;
  const editing = !!pumpId;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [harvesterIds, setHarvesterIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const { data: harvesters = [] } = useQuery({
    queryKey: ['harvesters', HarvesterStatus.ACTIVE],
    queryFn: () => harvestersApi.list(HarvesterStatus.ACTIVE),
  });

  const toggleHarvester = (id: string) =>
    setHarvesterIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const { data: existing } = useQuery({
    queryKey: ['fuel-pump-one', pumpId],
    queryFn: () => fuelPumpsApi.list().then((list) => list.find((p) => p.id === pumpId)),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? t('fuelPumpForm.editTitle') : t('fuelPumpForm.addTitle') });
  }, [editing, navigation, t]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPhone(existing.phone ?? '');
      setHarvesterIds(existing.harvesterIds ?? []);
      setIsActive(existing.isActive);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), phone: phone.trim() || undefined, harvesterIds, isActive };
      return editing ? fuelPumpsApi.update(pumpId, body) : fuelPumpsApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fuel-pumps'] });
      qc.invalidateQueries({ queryKey: ['fuel-pump-one', pumpId] });
      qc.invalidateQueries({ queryKey: ['fuel-pump-ledger', pumpId] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!name.trim()) return Alert.alert(t('fuelPumpForm.required'), t('fuelPumpForm.requiredName'));
    if (harvesterIds.length === 0)
      return Alert.alert(t('fuelPumpForm.required'), t('fuelPumpForm.requiredHarvesters'));
    save.mutate();
  };

  return (
    <Screen>
      <TextField label={t('fuelPumpForm.name')} value={name} onChangeText={setName} placeholder={t('fuelPumpForm.namePlaceholder')} />
      <TextField
        label={t('fuelPumpForm.phone')}
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
        keyboardType="number-pad"
        maxLength={10}
      />

      <Text style={styles.sectionLabel}>{t('fuelPumpForm.harvesters')}</Text>
      <Text style={styles.sectionHint}>{t('fuelPumpForm.harvestersHint')}</Text>
      <View style={styles.harvesterBox}>
        {harvesters.length === 0 ? (
          <Text style={styles.empty}>{t('fuelPumpForm.noHarvesters')}</Text>
        ) : (
          harvesters.map((h) => {
            const on = harvesterIds.includes(h.id);
            return (
              <Pressable key={h.id} style={styles.harvesterRow} onPress={() => toggleHarvester(h.id)}>
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on ? <Text style={styles.checkboxTick}>✓</Text> : null}
                </View>
                <Text style={styles.harvesterName}>{h.name}</Text>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.harvesterName}>{t('fuelPumpForm.active')}</Text>
        <Switch value={isActive} onValueChange={setIsActive} />
      </View>

      <Button
        title={editing ? t('fuelPumpForm.saveChanges') : t('fuelPumpForm.addPump')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text, marginTop: spacing.md },
  sectionHint: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },
  harvesterBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  harvesterRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontSize: font.size.sm, fontWeight: font.weight.bold },
  harvesterName: { fontSize: font.size.md, color: colors.text },
  empty: { fontSize: font.size.sm, color: colors.textMuted, padding: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg },
});
