import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { ExpenseType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { expensesApi, labourApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { useHarvesterOptions } from '@/hooks/useHarvesterOptions';
import { ExpensesStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { spacing } from '@/theme';
import { labelFromEnum } from '@/utils/format';

type Props = NativeStackScreenProps<ExpensesStackParamList, 'ExpenseForm'>;

const TYPE_OPTIONS = Object.values(ExpenseType).map((t) => ({ label: labelFromEnum(t), value: t }));

export function ExpenseFormScreen({ route, navigation }: Props) {
  const qc = useQueryClient();
  const expenseId = route.params?.expenseId;
  const editing = !!expenseId;
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const { options: harvesterOptions } = useHarvesterOptions();

  const [harvesterId, setHarvesterId] = useState(scopedHarvesterId(selectedId) ?? '');
  const [type, setType] = useState<ExpenseType>(ExpenseType.DIESEL);
  const [labourId, setLabourId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');

  const isLabour = type === ExpenseType.LABOUR;

  // Labour for the chosen harvester (so the list matches the expense's harvester).
  const { data: labourList = [] } = useQuery({
    queryKey: ['labour', harvesterId || 'all'],
    queryFn: () => labourApi.list(harvesterId || undefined),
  });
  const labourOptions = labourList.map((l) => ({
    label: `${l.name} · ${labelFromEnum(l.type)}`,
    value: l.id,
  }));

  const { data: existing } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => expensesApi.list().then((list) => list.find((e) => e.id === expenseId)),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit expense' : 'Add expense' });
  }, [editing, navigation]);

  useEffect(() => {
    if (existing) {
      setHarvesterId(existing.harvesterId);
      setType(existing.type);
      setLabourId(existing.labourId ?? '');
      setAmount(String(existing.amount));
      setDate(new Date(existing.date));
      setNotes(existing.notes ?? '');
    }
  }, [existing]);

  // Clear the labourer link if the type is changed away from Labour.
  const onTypeChange = (next: ExpenseType) => {
    setType(next);
    if (next !== ExpenseType.LABOUR) setLabourId('');
  };

  // Picking a labourer pre-fills the amount with their agreed wage (if empty).
  const onLabourChange = (id: string) => {
    setLabourId(id);
    const l = labourList.find((x) => x.id === id);
    const agreed = l?.customAmount ?? l?.dailyWage;
    if (agreed != null && !amount.trim()) setAmount(String(agreed));
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        harvesterId,
        type,
        labourId: isLabour ? labourId : undefined,
        amount: Number(amount),
        date: date.toISOString(),
        notes: notes.trim() || undefined,
      };
      return editing ? expensesApi.update(expenseId, body) : expensesApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['labour'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!harvesterId) return Alert.alert('Required', 'Select a harvester.');
    if (isLabour && !labourId) return Alert.alert('Required', 'Select the labourer this payment is for.');
    const value = Number(amount);
    if (!value || value <= 0) return Alert.alert('Required', 'Enter a valid amount.');
    save.mutate();
  };

  return (
    <Screen>
      <Select
        label="Harvester *"
        value={harvesterId}
        options={harvesterOptions}
        onChange={setHarvesterId}
        placeholder="Select harvester"
      />
      <Select
        label="Expense type *"
        value={type}
        options={TYPE_OPTIONS}
        onChange={(v) => onTypeChange(v as ExpenseType)}
      />

      {isLabour ? (
        <Select
          label="Labourer *"
          value={labourId}
          options={labourOptions}
          onChange={onLabourChange}
          placeholder={labourOptions.length ? 'Select labourer' : 'No labour for this harvester'}
        />
      ) : null}

      <TextField label="Amount *" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />
      <DateField label="Date" value={date} onChange={setDate} />
      <TextField label="Notes / Remarks" value={notes} onChangeText={setNotes} multiline />
      <Button
        title={editing ? 'Save changes' : 'Add expense'}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
