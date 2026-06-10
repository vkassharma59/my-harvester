import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { ExpenseType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { dashboardApi, settingsApi } from '@/api/endpoints';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { ErrorState, Loading } from '@/components/States';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, spacing } from '@/theme';
import { formatCurrency, labelFromEnum } from '@/utils/format';

export function DashboardScreen() {
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);

  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const currency = settingsQ.data?.currency ?? 'INR';

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', selectedId],
    queryFn: () => dashboardApi.summary(harvesterId),
  });

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
      <Section title="Financial summary">
        <View style={styles.grid}>
          <StatTile label="Total Earnings" value={money(data.financial.totalEarnings)} tone="positive" />
          <StatTile label="Total Expenses" value={money(data.financial.totalExpenses)} tone="negative" />
          <StatTile
            label="Net Profit"
            value={money(data.financial.netProfit)}
            tone={data.financial.netProfit >= 0 ? 'positive' : 'negative'}
          />
          <StatTile label="Pending Receivables" value={money(data.financial.pendingReceivables)} tone="accent" />
        </View>
      </Section>

      <Section title="Harvesting summary">
        <View style={styles.grid}>
          <StatTile label="Customers" value={String(data.harvesting.totalCustomers)} />
          <StatTile label="Plots Harvested" value={String(data.harvesting.totalPlots)} />
          <StatTile label="Area Harvested" value={`${data.harvesting.totalArea}`} />
          <StatTile label="Jobs Completed" value={String(data.harvesting.totalJobsCompleted)} />
        </View>
      </Section>

      <Section title="Expenses by category">
        <Card>
          {(Object.keys(data.expenses) as ExpenseType[]).map((type) => (
            <View key={type} style={styles.lineRow}>
              <Text style={styles.lineLabel}>{labelFromEnum(type)}</Text>
              <Text style={styles.lineValue}>{money(data.expenses[type])}</Text>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Labour summary">
        <View style={styles.grid}>
          <StatTile label="Total Labour Cost" value={money(data.labour.totalCost)} tone="negative" />
          <StatTile label="Pending Payments" value={String(data.labour.pendingPayments)} tone="accent" />
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
