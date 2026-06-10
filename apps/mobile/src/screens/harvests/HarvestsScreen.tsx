import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { customersApi, plotsApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { HarvestsStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, spacing } from '@/theme';
import { formatCurrency, formatDate, labelFromEnum } from '@/utils/format';

type Props = NativeStackScreenProps<HarvestsStackParamList, 'HarvestsList'>;

export function HarvestsScreen({ navigation }: Props) {
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['plots', selectedId],
    queryFn: () => plotsApi.list({ harvesterId }),
  });

  // Resolve customer names for display (one fetch, mapped by id).
  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => customersApi.list({ limit: 100 }),
  });
  const nameById = new Map((customers?.items ?? []).map((c) => [c.id, c.name]));

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <HarvesterPicker />
      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={<EmptyState title="No harvesting jobs" subtitle="Add a plot to record a job." />}
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('HarvestForm', { plotId: item.id })}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.plotName}</Text>
              <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
            </View>
            <Text style={styles.sub}>{nameById.get(item.customerId) ?? 'Customer'}</Text>
            <Text style={styles.sub}>
              {item.area} {labelFromEnum(item.areaUnit)} · {formatDate(item.harvestDate)}
            </Text>
            <Text style={styles.sub}>{labelFromEnum(item.harvestType)}</Text>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button title="+ Add harvesting job" onPress={() => navigation.navigate('HarvestForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, flexGrow: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text, flex: 1 },
  amount: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.primary },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
