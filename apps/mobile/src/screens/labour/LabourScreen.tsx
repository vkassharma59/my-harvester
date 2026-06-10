import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { PaymentStatus } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { labourApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { MoreStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency, labelFromEnum } from '@/utils/format';

type Props = NativeStackScreenProps<MoreStackParamList, 'Labour'>;

const statusTone: Record<PaymentStatus, { bg: string; fg: string }> = {
  [PaymentStatus.PAID]: { bg: '#E6F4EA', fg: colors.success },
  [PaymentStatus.PARTIAL]: { bg: '#FFF3E0', fg: colors.warning },
  [PaymentStatus.PENDING]: { bg: '#FDECEA', fg: colors.danger },
};

export function LabourScreen({ navigation }: Props) {
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['labour', selectedId],
    queryFn: () => labourApi.list(harvesterId),
  });

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <HarvesterPicker />
      <FlatList
        data={data}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={<EmptyState title="No labour records" subtitle="Add drivers and helpers." />}
        renderItem={({ item }) => {
          const tone = statusTone[item.paymentStatus];
          const wage = item.customAmount ?? item.dailyWage ?? 0;
          return (
            <Card onPress={() => navigation.navigate('LabourForm', { labourId: item.id })}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.badgeText, { color: tone.fg }]}>{labelFromEnum(item.paymentStatus)}</Text>
                </View>
              </View>
              <Text style={styles.sub}>{labelFromEnum(item.type)} · {item.mobile}</Text>
              <Text style={styles.sub}>
                {item.customAmount != null ? 'Custom' : 'Daily wage'}: {formatCurrency(wage)}
              </Text>
            </Card>
          );
        }}
      />
      <View style={styles.footer}>
        <Button title="+ Add labour" onPress={() => navigation.navigate('LabourForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, flexGrow: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { fontSize: font.size.xs, fontWeight: font.weight.semibold },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
