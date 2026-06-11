import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { agentsApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { MoreStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

type Props = NativeStackScreenProps<MoreStackParamList, 'Agents'>;

export function AgentsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['agents', selectedId],
    queryFn: () => agentsApi.list(harvesterId),
  });

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <HarvesterPicker />
      <FlatList
        data={data}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={<EmptyState title={t('agents.emptyTitle')} subtitle={t('agents.emptySubtitle')} />}
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('AgentLedger', { agentId: item.id, name: item.name })}>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.name}</Text>
              {!item.isActive ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('agents.inactive')}</Text>
                </View>
              ) : null}
            </View>
            {item.phone ? <Text style={styles.sub}>{item.phone}</Text> : null}
            <Text style={styles.sub}>
              {t('agents.commission')}: {formatCurrency(item.commissionRate)} {t('agents.perUnit')}
            </Text>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button title={t('agents.addAgent')} onPress={() => navigation.navigate('AgentForm')} />
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
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: '#FDECEA' },
  badgeText: { fontSize: font.size.xs, fontWeight: font.weight.semibold, color: colors.danger },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
