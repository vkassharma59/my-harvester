import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { expenseCategoriesApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { MoreStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'ExpenseCategories'>;

export function ExpenseCategoriesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseCategoriesApi.list(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => expenseCategoriesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const confirmDelete = (id: string) =>
    Alert.alert(t('expenseCategories.deleteTitle'), t('expenseCategories.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate(id) },
    ]);

  if (isLoading) return <Loading />;
  // Keep showing cached data when a refetch fails (e.g. offline); only show the
  // error screen when there's nothing cached to fall back on.
  if (isError && !data) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  const active = (data ?? []).filter((c) => c.isActive);

  return (
    <View style={styles.root}>
      <FlatList
        data={active}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListHeaderComponent={<Text style={styles.hint}>{t('expenseCategories.hint')}</Text>}
        ListEmptyComponent={
          <EmptyState title={t('expenseCategories.emptyTitle')} subtitle={t('expenseCategories.emptySubtitle')} />
        }
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('ExpenseCategoryForm', { categoryId: item.id })}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.name}</Text>
              <Pressable onPress={() => confirmDelete(item.id)} hitSlop={8}>
                <Text style={styles.deleteText}>{t('common.delete')}</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button
          title={t('expenseCategories.addCategory')}
          onPress={() => navigation.navigate('ExpenseCategoryForm')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, flexGrow: 1 },
  hint: { fontSize: font.size.sm, color: colors.textMuted, marginBottom: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  deleteText: { color: colors.danger, fontSize: font.size.sm },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
