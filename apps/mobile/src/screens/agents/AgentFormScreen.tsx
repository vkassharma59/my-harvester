import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { agentsApi } from '@/api/endpoints';
import { AmountField } from '@/components/AmountField';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { useHarvesterAccess } from '@/hooks/useHarvesterAccess';
import { useHarvesterOptions } from '@/hooks/useHarvesterOptions';
import { MoreStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'AgentForm'>;

export function AgentFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const agentId = route.params?.agentId;
  const editing = !!agentId;
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const { options: harvesterOptions } = useHarvesterOptions();
  const { soleHarvesterId } = useHarvesterAccess();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [harvesterId, setHarvesterId] = useState(
    soleHarvesterId ?? scopedHarvesterId(selectedId) ?? '',
  );
  const [commissionRate, setCommissionRate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: existing } = useQuery({
    queryKey: ['agent-one', agentId],
    queryFn: () => agentsApi.list().then((list) => list.find((a) => a.id === agentId)),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? t('agentForm.titleEdit') : t('agentForm.titleAdd') });
  }, [editing, navigation, t]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPhone(existing.phone ?? '');
      setHarvesterId(existing.harvesterId);
      setCommissionRate(String(existing.commissionRate));
      setIsActive(existing.isActive);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        harvesterId,
        commissionRate: Number(commissionRate),
        isActive,
      };
      return editing ? agentsApi.update(agentId, body) : agentsApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!name.trim()) return Alert.alert(t('agentForm.required'), t('agentForm.requiredName'));
    if (!harvesterId) return Alert.alert(t('agentForm.required'), t('agentForm.requiredHarvester'));
    const rate = Number(commissionRate);
    if (!rate || rate <= 0) return Alert.alert(t('agentForm.required'), t('agentForm.requiredRate'));
    save.mutate();
  };

  return (
    <Screen>
      <TextField label={t('agentForm.name')} value={name} onChangeText={setName} />
      <TextField
        label={t('agentForm.phone')}
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
        keyboardType="number-pad"
        maxLength={10}
        placeholder={t('common.optional')}
      />
      {!soleHarvesterId ? (
        <Select
          label={t('agentForm.harvester')}
          value={harvesterId}
          options={harvesterOptions}
          onChange={setHarvesterId}
          placeholder={t('agentForm.selectHarvester')}
        />
      ) : null}
      <AmountField
        label={t('agentForm.commissionRate')}
        value={commissionRate}
        onChangeText={setCommissionRate}
        placeholder={t('agentForm.commissionPlaceholder')}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('agentForm.active')}</Text>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ true: colors.primaryLight, false: colors.border }}
          thumbColor={isActive ? colors.primary : colors.surface}
        />
      </View>
      <Button
        title={editing ? t('agentForm.saveChanges') : t('agentForm.addAgent')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontSize: font.size.md, color: colors.text, fontWeight: font.weight.medium },
});
