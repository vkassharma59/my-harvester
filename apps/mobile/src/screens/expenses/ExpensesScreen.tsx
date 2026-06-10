import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { expensesApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { ExpensesStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, spacing } from '@/theme';
import { formatCurrency, formatDate, labelFromEnum } from '@/utils/format';

type Props = NativeStackScreenProps<ExpensesStackParamList, 'ExpensesList'>;

export function ExpensesScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['expenses', selectedId],
    queryFn: () => expensesApi.list({ harvesterId }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const confirmDelete = (id: string) =>
    Alert.alert('Delete expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <HarvesterPicker />
      <FlatList
        data={data}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={<EmptyState title="No expenses" subtitle="Record diesel, labour, parts and more." />}
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('ExpenseForm', { expenseId: item.id })}>
            <View style={styles.rowBetween}>
              <Text style={styles.type}>{labelFromEnum(item.type)}</Text>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            </View>
            <Text style={styles.sub}>{formatDate(item.date)}</Text>
            {item.notes ? <Text style={styles.sub}>{item.notes}</Text> : null}
            <Pressable onPress={() => confirmDelete(item.id)} hitSlop={8} style={styles.delete}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button title="+ Add expense" onPress={() => navigation.navigate('ExpenseForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, flexGrow: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  amount: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.danger },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  delete: { alignSelf: 'flex-end', marginTop: spacing.xs },
  deleteText: { color: colors.danger, fontSize: font.size.sm },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
