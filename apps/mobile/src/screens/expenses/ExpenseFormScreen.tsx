import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ExpenseType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { expenseCategoriesApi, expensesApi, fuelPumpsApi, uploadsApi } from '@/api/endpoints';
import { offlineCreate, offlineUpdate } from '@/offline/enqueue';
import { isOnline } from '@/offline/connectivity';
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
import { colors, font, spacing } from '@/theme';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Props = NativeStackScreenProps<ExpensesStackParamList, 'ExpenseForm'>;

const BUILTIN_VALUES = Object.values(ExpenseType) as string[];

export function ExpenseFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const expenseId = route.params?.expenseId;
  const editing = !!expenseId;
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const { options: harvesterOptions } = useHarvesterOptions();
  const { soleHarvesterId } = useHarvesterAccess();

  const [harvesterId, setHarvesterId] = useState(
    soleHarvesterId ?? scopedHarvesterId(selectedId) ?? '',
  );
  // A single selection: a built-in ExpenseType value OR a custom category id.
  const [category, setCategory] = useState<string>(ExpenseType.DIESEL);
  const [pumpId, setPumpId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [uploading, setUploading] = useState(false);

  const isCustom = !BUILTIN_VALUES.includes(category);
  const type = isCustom ? ExpenseType.OTHER : (category as ExpenseType);
  // Only the built-in "Other" requires a remark; custom categories don't.
  const isBuiltinOther = category === ExpenseType.OTHER;
  const isDiesel = category === ExpenseType.DIESEL;

  // Fuel pumps serving the chosen harvester (active only), for diesel expenses.
  const { data: pumps = [] } = useQuery({
    queryKey: ['fuel-pumps', harvesterId || 'all'],
    queryFn: () => fuelPumpsApi.list(harvesterId || undefined),
  });
  const pumpOptions = pumps.filter((p) => p.isActive).map((p) => ({ label: p.name, value: p.id }));

  // Custom categories defined by the super admin (active ones only). "Other"
  // is always listed last, after any custom types.
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseCategoriesApi.list(),
  });
  const typeOptions = [
    { label: tEnum('expenseType', ExpenseType.DIESEL), value: ExpenseType.DIESEL as string },
    { label: tEnum('expenseType', ExpenseType.SPARE_PARTS), value: ExpenseType.SPARE_PARTS as string },
    ...categories.filter((c) => c.isActive).map((c) => ({ label: c.name, value: c.id })),
    { label: tEnum('expenseType', ExpenseType.OTHER), value: ExpenseType.OTHER as string },
  ];

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
      setCategory(existing.categoryId ?? existing.type);
      setPumpId(existing.pumpId ?? '');
      setAmount(String(existing.amount));
      setDate(new Date(existing.date));
      setNotes(existing.notes ?? '');
      setAttachmentUrl(existing.attachmentUrl ?? '');
      if (existing.attachmentUrl) setAttachmentName(t('expenseForm.attachmentSaved'));
    }
  }, [existing, t]);

  const pickAttachment = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled) return;
    const asset = res.assets[0];
    if (asset.size != null && asset.size > MAX_FILE_BYTES) {
      Alert.alert(t('expenseForm.fileTooLargeTitle'), t('expenseForm.fileTooLarge'));
      return;
    }
    if (!isOnline()) {
      Alert.alert(t('expenseForm.attachOfflineTitle'), t('expenseForm.attachOffline'));
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadsApi.upload({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });
      setAttachmentUrl(url);
      setAttachmentName(asset.name);
    } catch (e) {
      Alert.alert(t('common.error'), apiErrorMessage(e, t('expenseForm.uploadFailed')));
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = () => {
    setAttachmentUrl('');
    setAttachmentName('');
  };

  // Auto-select the sole harvester once it resolves (covers super admins with one).
  useEffect(() => {
    if (soleHarvesterId && !harvesterId) setHarvesterId(soleHarvesterId);
  }, [soleHarvesterId, harvesterId]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        harvesterId,
        type,
        categoryId: isCustom ? category : null,
        pumpId: isDiesel ? pumpId || null : null,
        amount: Number(amount),
        date: date.toISOString(),
        notes: notes.trim() || undefined,
        attachmentUrl, // '' clears it on edit
      };
      if (editing) offlineUpdate('expense', expenseId, body);
      else offlineCreate('expense', body);
      return Promise.resolve();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!harvesterId) return Alert.alert(t('expenseForm.requiredTitle'), t('expenseForm.selectHarvester'));
    const value = Number(amount);
    if (!value || value <= 0) return Alert.alert(t('expenseForm.requiredTitle'), t('expenseForm.enterAmount'));
    if (isBuiltinOther && !notes.trim())
      return Alert.alert(t('expenseForm.requiredTitle'), t('expenseForm.remarkRequired'));
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
        value={category}
        options={typeOptions}
        onChange={setCategory}
      />

      {isDiesel ? (
        <Select
          label={t('expenseForm.pumpLabel')}
          value={pumpId}
          options={pumpOptions}
          onChange={setPumpId}
          placeholder={pumpOptions.length ? t('expenseForm.pumpPlaceholder') : t('expenseForm.noPumps')}
        />
      ) : null}

      <AmountField label={t('expenseForm.amountLabel')} value={amount} onChangeText={setAmount} placeholder="0" />
      <DateField label={t('expenseForm.dateLabel')} value={date} onChange={setDate} />
      <TextField
        label={isBuiltinOther ? `${t('expenseForm.notesLabel')} *` : t('expenseForm.notesLabel')}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Text style={styles.attachLabel}>{t('expenseForm.attachmentLabel')}</Text>
      {attachmentUrl ? (
        <View style={styles.attachRow}>
          <Pressable style={styles.attachInfo} onPress={() => void Linking.openURL(attachmentUrl).catch(() => {})}>
            <Text style={styles.attachIcon}>📎</Text>
            <Text style={styles.attachName} numberOfLines={1}>
              {attachmentName || t('expenseForm.attachmentSaved')}
            </Text>
          </Pressable>
          <Pressable onPress={removeAttachment} hitSlop={8}>
            <Text style={styles.attachRemove}>{t('expenseForm.removeAttachment')}</Text>
          </Pressable>
        </View>
      ) : (
        <Button
          title={t('expenseForm.attachFile')}
          variant="secondary"
          onPress={pickAttachment}
          loading={uploading}
        />
      )}
      <Text style={styles.attachHint}>{t('expenseForm.attachmentHint')}</Text>

      <Button
        title={editing ? t('expenseForm.saveChanges') : t('expenseForm.addTitle')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
      {uploading ? <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.primary} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  attachLabel: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text, marginBottom: spacing.xs },
  attachRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  attachInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.xs },
  attachIcon: { fontSize: font.size.md },
  attachName: { flex: 1, fontSize: font.size.sm, color: colors.primary },
  attachRemove: { fontSize: font.size.sm, color: colors.danger, fontWeight: font.weight.semibold },
  attachHint: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.xs },
});
