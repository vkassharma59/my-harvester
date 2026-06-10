import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { ExpenseType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { dashboardApi, settingsApi } from '@/api/endpoints';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { Screen } from '@/components/Screen';
import { ErrorState, Loading } from '@/components/States';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, spacing } from '@/theme';
import { formatCurrency, labelFromEnum } from '@/utils/format';

/**
 * Reports hub. For the MVP these are on-screen summaries derived from the
 * dashboard aggregation, scoped by the harvester selected in the header.
 * (PDF/CSV export is a planned enhancement.)
 */
export function ReportsScreen() {
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const harvesterId = scopedHarvesterId(selectedId);

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const currency = settings?.currency ?? 'INR';
  const money = (n: number) => formatCurrency(n, currency);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', selectedId],
    queryFn: () => dashboardApi.summary(harvesterId),
  });

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.flex}>
      <HarvesterPicker />
      <Screen refreshing={isRefetching} onRefresh={refetch}>
      <ReportCard title="Profit & Loss">
        <Line label="Total income" value={money(data.financial.totalEarnings)} />
        <Line label="Total expenses" value={money(data.financial.totalExpenses)} />
        <Line label="Net profit" value={money(data.financial.netProfit)} strong />
      </ReportCard>

      <ReportCard title="Customer outstanding">
        <Line label="Pending receivables" value={money(data.financial.pendingReceivables)} strong />
      </ReportCard>

      <ReportCard title="Expense report">
        {(Object.keys(data.expenses) as ExpenseType[]).map((t) => (
          <Line key={t} label={labelFromEnum(t)} value={money(data.expenses[t])} />
        ))}
      </ReportCard>

      <ReportCard title="Labour payment report">
        <Line label="Total labour cost" value={money(data.labour.totalCost)} />
        <Line label="Unpaid / partial" value={String(data.labour.pendingPayments)} />
      </ReportCard>

      <ReportCard title="Harvesting report">
        <Line label="Customers" value={String(data.harvesting.totalCustomers)} />
        <Line label="Plots harvested" value={String(data.harvesting.totalPlots)} />
        <Line label="Area harvested" value={String(data.harvesting.totalArea)} />
        <Line label="Jobs completed" value={String(data.harvesting.totalJobsCompleted)} />
      </ReportCard>
      </Screen>
    </View>
  );
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.title}>{title}</Text>
      <Card>{children}</Card>
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.label, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.value, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text, marginBottom: spacing.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  label: { fontSize: font.size.sm, color: colors.textMuted },
  value: { fontSize: font.size.sm, color: colors.text, fontWeight: font.weight.medium },
  strong: { fontWeight: font.weight.bold, color: colors.primary, fontSize: font.size.md },
});
