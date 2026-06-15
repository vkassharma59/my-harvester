import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { LabourType, WageType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { labourApi } from '@/api/endpoints';
import { tEnum } from '@/i18n';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { MoreStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

type Props = NativeStackScreenProps<MoreStackParamList, 'Labour'>;

export function LabourScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['labour', selectedId],
    queryFn: () => labourApi.list(harvesterId),
  });

  if (isLoading) return <Loading />;
  // Keep showing cached data when a refetch fails (e.g. offline); only show the
  // error screen when there's nothing cached to fall back on.
  if (isError && !data) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <HarvesterPicker />
      <FlatList
        data={data}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={<EmptyState title={t('labour.emptyTitle')} subtitle={t('labour.emptySubtitle')} />}
        renderItem={({ item }) => {
          const isFixed = item.wageType === WageType.FIXED;
          const typeLabel =
            item.type === LabourType.OTHER && item.customType
              ? item.customType
              : tEnum('labourType', item.type);
          return (
            <Card onPress={() => navigation.navigate('LabourLedger', { labourId: item.id, name: item.name })}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.wage}>{formatCurrency(item.totalBill)}</Text>
              </View>
              <Text style={styles.sub}>{typeLabel} · {item.mobile}</Text>
              <Text style={styles.sub}>
                {isFixed
                  ? t('labour.fixed')
                  : t('labour.daysWorked', {
                      count: item.totalWorkingDays,
                      rate: formatCurrency(item.dailyWage ?? 0),
                    })}
              </Text>
            </Card>
          );
        }}
      />
      <View style={styles.footer}>
        <Button title={t('labour.addLabour')} onPress={() => navigation.navigate('LabourForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, flexGrow: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  wage: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.primary },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
