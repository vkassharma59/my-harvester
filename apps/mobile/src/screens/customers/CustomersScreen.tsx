import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { customersApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { useCurrency } from '@/hooks/useCurrency';
import { CustomersStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

type Props = NativeStackScreenProps<CustomersStackParamList, 'CustomersList'>;

export function CustomersScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const currency = useCurrency();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ search: search.trim() || undefined, limit: 100 }),
  });

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <TextField
          label={t('common.search')}
          value={search}
          onChangeText={setSearch}
          placeholder={t('customers.searchPlaceholder')}
        />
      </View>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={<EmptyState title={t('customers.emptyTitle')} subtitle={t('customers.emptySubtitle')} />}
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('CustomerLedger', { customerId: item.id, name: item.name })}>
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sub}>{item.phone}</Text>
                  {item.village ? <Text style={styles.sub}>{item.village}</Text> : null}
                </View>
                <View style={styles.right}>
                  <Text style={styles.amountLabel}>{t('customers.outstanding')}</Text>
                  <Text
                    style={[styles.amount, item.outstanding > 0 ? styles.due : styles.clear]}
                    numberOfLines={1}
                  >
                    {formatCurrency(item.outstanding, currency)}
                  </Text>
                  <Text style={styles.billLabel}>
                    {t('customers.billLabel', { amount: formatCurrency(item.totalBill, currency) })}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      <View style={styles.footer}>
        <Button title={t('customers.addCustomer')} onPress={() => navigation.navigate('CustomerForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  searchBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  left: { flex: 1, paddingRight: spacing.sm },
  right: { alignItems: 'flex-end' },
  name: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  amountLabel: { fontSize: font.size.xs, color: colors.textMuted },
  amount: { fontSize: font.size.md, fontWeight: font.weight.bold },
  due: { color: colors.danger },
  clear: { color: colors.success },
  billLabel: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
