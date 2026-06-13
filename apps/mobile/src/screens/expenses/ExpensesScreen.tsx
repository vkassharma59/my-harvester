import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExpenseType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { expenseCategoriesApi, expensesApi } from '@/api/endpoints';
import { offlineRemove } from '@/offline/enqueue';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { tEnum } from '@/i18n';
import { ExpensesStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';

type Props = NativeStackScreenProps<ExpensesStackParamList, 'ExpensesList'>;

const BUILTIN_VALUES = Object.values(ExpenseType) as string[];
// Diesel & Spare Parts first, custom types in the middle, "Other" always last.
const LEADING_FILTERS = [ExpenseType.DIESEL, ExpenseType.SPARE_PARTS];

export function ExpensesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);
  // 'ALL', a built-in ExpenseType, or a custom category id.
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['expenses', selectedId],
    queryFn: () => expensesApi.list({ harvesterId }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseCategoriesApi.list(),
  });
  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? t('expenses.deletedCategory');

  const remove = useMutation({
    mutationFn: (id: string) => {
      offlineRemove('expense', id);
      return Promise.resolve();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const confirmDelete = (id: string) =>
    Alert.alert(t('expenses.deleteTitle'), t('common.areYouSure'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate(id) },
    ]);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  const chipValues: string[] = [
    'ALL',
    ...LEADING_FILTERS,
    ...categories.filter((c) => c.isActive).map((c) => c.id),
    ExpenseType.OTHER,
  ];
  const chipLabel = (v: string) =>
    v === 'ALL' ? t('expenses.all') : BUILTIN_VALUES.includes(v) ? tEnum('expenseType', v) : catName(v);

  const matches = (e: { type: ExpenseType; categoryId?: string | null }) => {
    if (typeFilter === 'ALL') return true;
    // A built-in chip shows only built-in expenses (custom ones live under their
    // own chip even though they're stored as type OTHER).
    if (BUILTIN_VALUES.includes(typeFilter)) return e.type === typeFilter && !e.categoryId;
    return e.categoryId === typeFilter;
  };

  // Worker payments live in the worker ledger now, not in expenses.
  const rows = (data ?? []).filter((e) => e.type !== ExpenseType.LABOUR);
  const visible = rows.filter(matches);
  const total = visible.reduce((sum, e) => sum + e.amount, 0);
  const filterLabel = chipLabel(typeFilter);

  return (
    <View style={styles.root}>
      <HarvesterPicker />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipBar}
        contentContainerStyle={styles.chips}
      >
        {chipValues.map((opt) => {
          const active = typeFilter === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => setTypeFilter(opt)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chipLabel(opt)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <FlatList
        data={visible}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={
          visible.length > 0 ? (
            <Card style={styles.totalCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.totalLabel}>{t('expenses.total', { type: filterLabel })}</Text>
                <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
              </View>
              <Text style={styles.sub}>{t('expenses.entries', { count: visible.length })}</Text>
            </Card>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={t('expenses.emptyTitle')}
            subtitle={
              typeFilter === 'ALL'
                ? t('expenses.emptySubtitle')
                : t('expenses.emptyTypeSubtitle', { type: filterLabel.toLowerCase() })
            }
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('ExpenseForm', { expenseId: item.id })}>
            <View style={styles.rowBetween}>
              <Text style={styles.type}>
                {item.categoryId ? catName(item.categoryId) : tEnum('expenseType', item.type)}
              </Text>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            </View>
            <Text style={styles.sub}>{formatDate(item.date)}</Text>
            {item.notes ? <Text style={styles.sub}>{item.notes}</Text> : null}
            {item.attachmentUrl ? (
              <Pressable
                onPress={() => void Linking.openURL(item.attachmentUrl as string).catch(() => {})}
                hitSlop={8}
              >
                <Text style={styles.attachLink}>{t('expenses.viewAttachment')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => confirmDelete(item.id)} hitSlop={8} style={styles.delete}>
              <Text style={styles.deleteText}>{t('common.delete')}</Text>
            </Pressable>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button title={t('expenses.addExpense')} onPress={() => navigation.navigate('ExpenseForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  chipBar: { flexGrow: 0, flexShrink: 0 },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.medium },
  chipTextActive: { color: colors.white, fontWeight: font.weight.semibold },
  list: { padding: spacing.lg, flexGrow: 1 },
  totalCard: { borderColor: colors.primary, borderWidth: 1.5 },
  totalLabel: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  totalAmount: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.danger },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  amount: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.danger },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  attachLink: { color: colors.primary, fontSize: font.size.sm, marginTop: spacing.xs },
  delete: { alignSelf: 'flex-end', marginTop: spacing.xs },
  deleteText: { color: colors.danger, fontSize: font.size.sm },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
