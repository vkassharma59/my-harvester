import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { LabourType, PaymentStatus } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { labourApi } from '@/api/endpoints';
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
import { labelFromEnum } from '@/utils/format';

type Props = NativeStackScreenProps<MoreStackParamList, 'LabourForm'>;

const STATUS_OPTIONS = Object.values(PaymentStatus).map((s) => ({ label: labelFromEnum(s), value: s }));

export function LabourFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const TYPE_OPTIONS = Object.values(LabourType).map((v) => ({ label: tEnum('labourType', v), value: v }));
  const qc = useQueryClient();
  const labourId = route.params?.labourId;
  const editing = !!labourId;
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const { options: harvesterOptions } = useHarvesterOptions();
  const { soleHarvesterId } = useHarvesterAccess();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [type, setType] = useState<LabourType>(LabourType.HELPER);
  const [harvesterId, setHarvesterId] = useState(
    soleHarvesterId ?? scopedHarvesterId(selectedId) ?? '',
  );
  const [dailyWage, setDailyWage] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);

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
      setHarvesterId(existing.harvesterId);
      setDailyWage(existing.dailyWage != null ? String(existing.dailyWage) : '');
      setCustomAmount(existing.customAmount != null ? String(existing.customAmount) : '');
      setPaymentStatus(existing.paymentStatus);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        mobile,
        type,
        harvesterId,
        dailyWage: dailyWage ? Number(dailyWage) : undefined,
        customAmount: customAmount ? Number(customAmount) : undefined,
        paymentStatus,
      };
      return editing ? labourApi.update(labourId, body) : labourApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labour'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!name.trim() || !mobile.trim())
      return Alert.alert(t('labourForm.required'), t('labourForm.requiredNameMobile'));
    if (!harvesterId) return Alert.alert(t('labourForm.required'), t('labourForm.requiredHarvester'));
    save.mutate();
  };

  return (
    <Screen>
      <Button
        title={t('labourForm.importContacts')}
        variant="secondary"
        onPress={importFromContacts}
        style={{ marginBottom: spacing.lg }}
      />
      <TextField label={t('labourForm.name')} value={name} onChangeText={setName} />
      <TextField
        label={t('labourForm.mobile')}
        value={mobile}
        onChangeText={(v) => setMobile(v.replace(/[^0-9]/g, '').slice(0, 10))}
        keyboardType="number-pad"
        maxLength={10}
      />
      <Select label={t('labourForm.labourType')} value={type} options={TYPE_OPTIONS} onChange={(v) => setType(v as LabourType)} />
      {!soleHarvesterId ? (
        <Select
          label={t('labourForm.harvester')}
          value={harvesterId}
          options={harvesterOptions}
          onChange={setHarvesterId}
          placeholder={t('labourForm.selectHarvester')}
        />
      ) : null}
      <AmountField label={t('labourForm.dailyWage')} value={dailyWage} onChangeText={setDailyWage} placeholder={t('labourForm.dailyWagePlaceholder')} />
      <AmountField
        label={t('labourForm.customAmount')}
        value={customAmount}
        onChangeText={setCustomAmount}
        placeholder={t('common.optional')}
      />
      <Select
        label={t('labourForm.paymentStatus')}
        value={paymentStatus}
        options={STATUS_OPTIONS}
        onChange={(v) => setPaymentStatus(v as PaymentStatus)}
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
