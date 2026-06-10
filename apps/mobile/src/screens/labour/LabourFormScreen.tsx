import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { LabourType, PaymentStatus } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { labourApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { useHarvesterOptions } from '@/hooks/useHarvesterOptions';
import { MoreStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { spacing } from '@/theme';
import { labelFromEnum } from '@/utils/format';

type Props = NativeStackScreenProps<MoreStackParamList, 'LabourForm'>;

const TYPE_OPTIONS = Object.values(LabourType).map((t) => ({ label: labelFromEnum(t), value: t }));
const STATUS_OPTIONS = Object.values(PaymentStatus).map((s) => ({ label: labelFromEnum(s), value: s }));

export function LabourFormScreen({ route, navigation }: Props) {
  const qc = useQueryClient();
  const labourId = route.params?.labourId;
  const editing = !!labourId;
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const { options: harvesterOptions } = useHarvesterOptions();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [type, setType] = useState<LabourType>(LabourType.HELPER);
  const [harvesterId, setHarvesterId] = useState(scopedHarvesterId(selectedId) ?? '');
  const [dailyWage, setDailyWage] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);

  const { data: existing } = useQuery({
    queryKey: ['labour-one', labourId],
    queryFn: () => labourApi.list().then((list) => list.find((l) => l.id === labourId)),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit labour' : 'Add labour' });
  }, [editing, navigation]);

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
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!name.trim() || !mobile.trim()) return Alert.alert('Required', 'Name and mobile are required.');
    if (!harvesterId) return Alert.alert('Required', 'Select a harvester.');
    save.mutate();
  };

  return (
    <Screen>
      <TextField label="Name *" value={name} onChangeText={setName} />
      <TextField label="Mobile *" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      <Select label="Labour type *" value={type} options={TYPE_OPTIONS} onChange={(v) => setType(v as LabourType)} />
      <Select
        label="Harvester *"
        value={harvesterId}
        options={harvesterOptions}
        onChange={setHarvesterId}
        placeholder="Select harvester"
      />
      <TextField label="Daily wage" value={dailyWage} onChangeText={setDailyWage} keyboardType="numeric" placeholder="e.g. 500" />
      <TextField
        label="Custom amount (overrides daily wage)"
        value={customAmount}
        onChangeText={setCustomAmount}
        keyboardType="numeric"
        placeholder="Optional"
      />
      <Select
        label="Payment status"
        value={paymentStatus}
        options={STATUS_OPTIONS}
        onChange={(v) => setPaymentStatus(v as PaymentStatus)}
      />
      <Button
        title={editing ? 'Save changes' : 'Add labour'}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
