import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { customersApi, plotsApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { useHarvestTypeLabel } from '@/hooks/useHarvestTypeLabel';
import { tEnum } from '@/i18n';
import { HarvestsStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, spacing } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';

type Props = NativeStackScreenProps<HarvestsStackParamList, 'HarvestsList'>;

export function HarvestsScreen({ navigation, route }: Props) {
  const customerId = route.params?.customerId;
  const customerName = route.params?.customerName;

  const { t } = useTranslation();
  const harvestTypeLabel = useHarvestTypeLabel();
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);
  const [search, setSearch] = useState('');

  // When deep-linked from a customer, show all of that customer's jobs (across
  // harvesters the user can see); otherwise scope to the selected harvester.
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['plots', customerId ?? selectedId, customerId ? 'customer' : 'harvester'],
    queryFn: () => plotsApi.list(customerId ? { customerId } : { harvesterId }),
  });

  // Resolve customer names + phones for display and search (one fetch, mapped by id).
  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => customersApi.list({ limit: 1000 }),
  });
  const custById = new Map((customers?.items ?? []).map((c) => [c.id, c]));

  if (isLoading) return <Loading />;
  // Keep showing cached data when a refetch fails (e.g. offline); only show the
  // error screen when there's nothing cached to fall back on.
  if (isError && !data) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  const clearCustomer = () => navigation.setParams({ customerId: undefined, customerName: undefined });

  const q = search.trim().toLowerCase();
  const all = data ?? [];
  const filtered = q
    ? all.filter((p) => {
        const c = custById.get(p.customerId);
        const name = (c?.name ?? '').toLowerCase();
        const phone = (c?.phone ?? '').toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
    : all;

  // Filtering (search or customer deep-link) shows every match; the default
  // view shows only the 8 most recent jobs (list is sorted newest-first).
  const filtering = !!q || !!customerId;
  const visible = filtering ? filtered : filtered.slice(0, 8);
  const hasMore = !filtering && filtered.length > visible.length;

  return (
    <View style={styles.root}>
      {customerId ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText} numberOfLines={1}>
            {t('harvests.bannerFor', { name: customerName ?? t('harvests.customerFallback') })}
          </Text>
          <Pressable onPress={clearCustomer} hitSlop={8}>
            <Text style={styles.bannerClear}>{t('common.showAll')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <HarvesterPicker />
          <View style={styles.searchBar}>
            <TextField
              label={t('common.search')}
              value={search}
              onChangeText={setSearch}
              placeholder={t('harvests.searchPlaceholder')}
              autoCapitalize="none"
            />
          </View>
        </>
      )}
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={
          filtering ? (
            <EmptyState title={t('harvests.noMatchTitle')} subtitle={t('harvests.noMatchSubtitle')} />
          ) : (
            <EmptyState title={t('harvests.emptyTitle')} subtitle={t('harvests.emptySubtitle')} />
          )
        }
        ListFooterComponent={
          hasMore ? <Text style={styles.more}>{t('harvests.recentLimit')}</Text> : null
        }
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('HarvestForm', { plotId: item.id })}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{custById.get(item.customerId)?.name ?? t('harvests.customerFallback')}</Text>
              <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
            </View>
            <Text style={styles.sub}>
              {item.area} {tEnum('areaUnit', item.areaUnit)} · {formatDate(item.harvestDate)}
            </Text>
            <Text style={styles.sub}>{harvestTypeLabel(item.harvesterId, item.harvestType)}</Text>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button title={t('harvests.addJob')} onPress={() => navigation.navigate('HarvestForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  searchBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bannerText: { flex: 1, fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  bannerClear: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: colors.primary,
    paddingLeft: spacing.md,
  },
  list: { padding: spacing.lg, flexGrow: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text, flex: 1 },
  amount: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.primary },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  more: { fontSize: font.size.xs, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
