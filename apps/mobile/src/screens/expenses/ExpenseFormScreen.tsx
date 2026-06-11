import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { ExpenseType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { expensesApi, labourApi } from '@/api/endpoints';
import { AmountField } from '@/components/AmountField';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { useHarvesterAccess } from '@/hooks/useHarvesterAccess';
import { useHarvesterOptions } from '@/hooks/useHarvesterOptions';
import { tEnum } from '@/i18n';
import { ExpensesStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { spacing } from '@/theme';

type Props = NativeStackScreenProps<ExpensesStackParamList, 'ExpenseForm'>;

export function ExpenseFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const typeOptions = Object.values(ExpenseType).map((value) => ({
    label: tEnum('expenseType', value),
    value,
  }));
  const expenseId = route.params?.expenseId;
  const editing = !!expenseId;
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const { options: harvesterOptions } = useHarvesterOptions();
  const { soleHarvesterId } = useHarvesterAccess();

  const [harvesterId, setHarvesterId] = useState(
    soleHarvesterId ?? scopedHarvesterId(selectedId) ?? '',
  );
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
    label: `${l.name} · ${tEnum('labourType', l.type)}`,
    value: l.id,
  }));

  const { data: existing } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => expensesApi.list().then((list) => list.find((e) => e.id === expenseId)),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? t('expenseForm.editTitle') : t('expenseForm.addTitle') });
  }, [editing, navigation, t]);

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
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!harvesterId) return Alert.alert(t('expenseForm.requiredTitle'), t('expenseForm.selectHarvester'));
    if (isLabour && !labourId)
      return Alert.alert(t('expenseForm.requiredTitle'), t('expenseForm.selectLabourer'));
    const value = Number(amount);
    if (!value || value <= 0) return Alert.alert(t('expenseForm.requiredTitle'), t('expenseForm.enterAmount'));
    save.mutate();
  };

  return (
    <Screen>
      {!soleHarvesterId ? (
        <Select
          label={t('expenseForm.harvesterLabel')}
          value={harvesterId}
          options={harvesterOptions}
          onChange={setHarvesterId}
          placeholder={t('expenseForm.harvesterPlaceholder')}
        />
      ) : null}
      <Select
        label={t('expenseForm.typeLabel')}
        value={type}
        options={typeOptions}
        onChange={(v) => onTypeChange(v as ExpenseType)}
      />

      {isLabour ? (
        <Select
          label={t('expenseForm.labourerLabel')}
          value={labourId}
          options={labourOptions}
          onChange={onLabourChange}
          placeholder={
            labourOptions.length
              ? t('expenseForm.labourerPlaceholder')
              : t('expenseForm.noLabour')
          }
        />
      ) : null}

      <AmountField label={t('expenseForm.amountLabel')} value={amount} onChangeText={setAmount} placeholder="0" />
      <DateField label={t('expenseForm.dateLabel')} value={date} onChange={setDate} />
      <TextField label={t('expenseForm.notesLabel')} value={notes} onChangeText={setNotes} multiline />
      <Button
        title={editing ? t('expenseForm.saveChanges') : t('expenseForm.addTitle')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
