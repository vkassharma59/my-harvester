import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { LabourType, WageType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { labourApi } from '@/api/endpoints';
import { offlineCreate, offlineUpdate } from '@/offline/enqueue';
import { tEnum } from '@/i18n';
import { AmountField } from '@/components/AmountField';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { useHarvesterAccess } from '@/hooks/useHarvesterAccess';
import { useHarvesterOptions } from '@/hooks/useHarvesterOptions';
import { MoreStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'LabourForm'>;

export function LabourFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const TYPE_OPTIONS = Object.values(LabourType).map((v) => ({ label: tEnum('labourType', v), value: v }));
  const WAGE_OPTIONS = Object.values(WageType).map((v) => ({ label: tEnum('wageType', v), value: v }));
  const qc = useQueryClient();
  const labourId = route.params?.labourId;
  const editing = !!labourId;
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const { options: harvesterOptions } = useHarvesterOptions();
  const { soleHarvesterId } = useHarvesterAccess();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [type, setType] = useState<LabourType>(LabourType.HELPER);
  const [customType, setCustomType] = useState('');
  const [harvesterId, setHarvesterId] = useState(
    soleHarvesterId ?? scopedHarvesterId(selectedId) ?? '',
  );
  const [wageType, setWageType] = useState<WageType>(WageType.DAILY);
  // A single amount: the daily rate (DAILY) or the fixed total (FIXED).
  const [wage, setWage] = useState('');

  const importFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('labourForm.permissionNeeded'), t('labourForm.permissionMessage'));
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const raw = contact.phoneNumbers?.[0]?.number ?? '';
      const digits = raw.replace(/[^0-9]/g, '');
      // `name` isn't always populated by the picker — build it from first+last.
      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
      setName(fullName || contact.name || name);
      // Keep the last 10 digits (drops country code / spacing).
      setMobile(digits.length > 10 ? digits.slice(-10) : digits);
    } catch (e) {
      Alert.alert(t('labourForm.contacts'), apiErrorMessage(e, t('labourForm.contactsError')));
    }
  };

  const { data: existing } = useQuery({
    queryKey: ['labour-one', labourId],
    queryFn: () => labourApi.list().then((list) => list.find((l) => l.id === labourId)),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? t('labourForm.titleEdit') : t('labourForm.titleAdd') });
  }, [editing, navigation, t]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setMobile(existing.mobile);
      setType(existing.type);
      setCustomType(existing.customType ?? '');
      setHarvesterId(existing.harvesterId);
      const wt = existing.wageType ?? WageType.DAILY;
      setWageType(wt);
      const amt = wt === WageType.FIXED ? existing.customAmount : existing.dailyWage;
      setWage(amt != null ? String(amt) : '');
    }
  }, [existing]);

  // Auto-select the sole harvester once it resolves (covers super admins with one).
  useEffect(() => {
    if (soleHarvesterId && !harvesterId) setHarvesterId(soleHarvesterId);
  }, [soleHarvesterId, harvesterId]);

  const save = useMutation({
    mutationFn: () => {
      const amount = wage ? Number(wage) : undefined;
      const body = {
        name,
        mobile,
        type,
        customType: type === LabourType.OTHER ? customType.trim() || undefined : undefined,
        harvesterId,
        wageType,
        dailyWage: wageType === WageType.DAILY ? amount : undefined,
        customAmount: wageType === WageType.FIXED ? amount : undefined,
      };
      if (editing) offlineUpdate('labour', labourId, body);
      else offlineCreate('labour', body);
      return Promise.resolve();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labour'] });
      qc.invalidateQueries({ queryKey: ['labour-one', labourId] });
      qc.invalidateQueries({ queryKey: ['labour-ledger', labourId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!name.trim() || !mobile.trim())
      return Alert.alert(t('labourForm.required'), t('labourForm.requiredNameMobile'));
    if (type === LabourType.OTHER && !customType.trim())
      return Alert.alert(t('labourForm.required'), t('labourForm.requiredCustomType'));
    if (!harvesterId) return Alert.alert(t('labourForm.required'), t('labourForm.requiredHarvester'));
    save.mutate();
  };

  return (
    <Screen>
      {!editing ? (
        <Button
          title={t('labourForm.importContacts')}
          variant="secondary"
          onPress={importFromContacts}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}
      <TextField label={t('labourForm.name')} value={name} onChangeText={setName} />
      <TextField
        label={t('labourForm.mobile')}
        value={mobile}
        onChangeText={(v) => setMobile(v.replace(/[^0-9]/g, '').slice(0, 10))}
        keyboardType="number-pad"
        maxLength={10}
      />
      <Select label={t('labourForm.labourType')} value={type} options={TYPE_OPTIONS} onChange={(v) => setType(v as LabourType)} />
      {type === LabourType.OTHER ? (
        <TextField
          label={t('labourForm.customType')}
          value={customType}
          onChangeText={setCustomType}
          placeholder={t('labourForm.customTypePlaceholder')}
        />
      ) : null}
      {!soleHarvesterId ? (
        <Select
          label={t('labourForm.harvester')}
          value={harvesterId}
          options={harvesterOptions}
          onChange={setHarvesterId}
          placeholder={t('labourForm.selectHarvester')}
        />
      ) : null}
      <Select
        label={t('labourForm.wageType')}
        value={wageType}
        options={WAGE_OPTIONS}
        onChange={(v) => setWageType(v as WageType)}
      />
      <AmountField
        label={wageType === WageType.FIXED ? t('labourForm.fixedWage') : t('labourForm.dailyWage')}
        value={wage}
        onChangeText={setWage}
        placeholder={t('labourForm.dailyWagePlaceholder')}
      />
      <Button
        title={editing ? t('labourForm.saveChanges') : t('labourForm.addLabour')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
