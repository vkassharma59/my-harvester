import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { ExpenseType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { agentsApi, dashboardApi, settingsApi } from '@/api/endpoints';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { ErrorState, Loading } from '@/components/States';
import { tEnum } from '@/i18n';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

export function DashboardScreen() {
  const { t } = useTranslation();
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);

  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const currency = settingsQ.data?.currency ?? 'INR';
  const areaUnit = settingsQ.data?.defaultAreaUnit;

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', selectedId],
    queryFn: () => dashboardApi.summary(harvesterId),
  });

  // Show the commission row only when the (scoped) harvester has an active agent.
  const agentsQ = useQuery({
    queryKey: ['agents', selectedId],
    queryFn: () => agentsApi.list(harvesterId),
  });
  const hasActiveAgent = (agentsQ.data ?? []).some((a) => a.isActive);

  if (isLoading) return <Loading />;
  if (isError || !data) {
    return (
      <Screen>
        <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const money = (n: number) => formatCurrency(n, currency);

  return (
    <View style={styles.flex}>
      <HarvesterPicker />
      <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Section title={t('dashboard.financialSummary')}>
        <View style={styles.grid}>
          <StatTile label={t('dashboard.totalEarnings')} value={money(data.financial.totalEarnings)} tone="positive" />
          <StatTile label={t('dashboard.totalExpenses')} value={money(data.financial.totalExpenses)} tone="negative" />
          <StatTile
            label={t('dashboard.netProfit')}
            value={money(data.financial.netProfit)}
            tone={data.financial.netProfit >= 0 ? 'positive' : 'negative'}
          />
          <StatTile label={t('dashboard.pendingReceivables')} value={money(data.financial.pendingReceivables)} tone="accent" />
        </View>
      </Section>

      <Section title={t('dashboard.harvestingSummary')}>
        <View style={styles.grid}>
          <StatTile label={t('dashboard.customers')} value={String(data.harvesting.totalCustomers)} />
          <StatTile label={t('dashboard.plotsHarvested')} value={String(data.harvesting.totalPlots)} />
          <StatTile
            label={t('dashboard.areaHarvested')}
            value={areaUnit ? `${data.harvesting.totalArea} ${tEnum('areaUnit', areaUnit)}` : `${data.harvesting.totalArea}`}
          />
          <StatTile label={t('dashboard.jobsCompleted')} value={String(data.harvesting.totalJobsCompleted)} />
        </View>
      </Section>

      <Section title={t('dashboard.expensesByCategory')}>
        <Card>
          {hasActiveAgent ? (
            <View style={styles.lineRow}>
              <Text style={styles.lineLabel}>{t('dashboard.agentCommission')}</Text>
              <Text style={styles.lineValue}>{money(data.financial.agentCommission)}</Text>
            </View>
          ) : null}
          {(Object.keys(data.expenses) as ExpenseType[]).map((type) => (
            <View key={type} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{tEnum('expenseType', type)}</Text>
              <Text style={styles.lineValue}>{money(data.expenses[type])}</Text>
            </View>
          ))}
          {data.customExpenses.map((c) => (
            <View key={c.id} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{c.name}</Text>
              <Text style={styles.lineValue}>{money(c.amount)}</Text>
            </View>
          ))}
        </Card>
      </Section>

      <Section title={t('dashboard.labourSummary')}>
        <View style={styles.grid}>
          <StatTile label={t('dashboard.totalLabourCost')} value={money(data.labour.totalCost)} tone="negative" />
          <StatTile label={t('dashboard.pendingPayments')} value={String(data.labour.pendingPayments)} tone="accent" />
        </View>
      </Section>
      </Screen>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  lineLabel: { fontSize: font.size.sm, color: colors.textMuted },
  lineValue: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text },
});
