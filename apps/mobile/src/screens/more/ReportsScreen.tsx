import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { ExpenseType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { dashboardApi, settingsApi } from '@/api/endpoints';
import { Card } from '@/components/Card';
import { HarvesterPicker } from '@/components/HarvesterPicker';
import { Screen } from '@/components/Screen';
import { ErrorState, Loading } from '@/components/States';
import { tEnum } from '@/i18n';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

/**
 * Reports hub. For the MVP these are on-screen summaries derived from the
 * dashboard aggregation, scoped by the harvester selected in the header.
 * (PDF/CSV export is a planned enhancement.)
 */
export function ReportsScreen() {
  const { t } = useTranslation();
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
      <ReportCard title={t('reports.profitLoss')}>
        <Line label={t('reports.totalIncome')} value={money(data.financial.totalEarnings)} />
        <Line label={t('reports.totalExpenses')} value={money(data.financial.totalExpenses)} />
        <Line label={t('reports.totalLabourCost')} value={money(data.labour.totalCost)} />
        <Line label={t('reports.netProfit')} value={money(data.financial.netProfit)} strong />
      </ReportCard>

      <ReportCard title={t('reports.customerOutstanding')}>
        <Line label={t('reports.pendingReceivables')} value={money(data.financial.pendingReceivables)} strong />
      </ReportCard>

      <ReportCard title={t('reports.expenseReport')}>
        <Line
          label={tEnum('expenseType', ExpenseType.DIESEL)}
          value={money(data.expenses[ExpenseType.DIESEL])}
        />
        <Line
          label={tEnum('expenseType', ExpenseType.SPARE_PARTS)}
          value={money(data.expenses[ExpenseType.SPARE_PARTS])}
        />
        {data.customExpenses.map((c) => (
          <Line key={c.id} label={c.name} value={money(c.amount)} />
        ))}
        <Line
          label={tEnum('expenseType', ExpenseType.OTHER)}
          value={money(data.expenses[ExpenseType.OTHER])}
        />
        <Line label={t('reports.agentCommission')} value={money(data.financial.agentCommission)} />
      </ReportCard>

      <ReportCard title={t('reports.labourPaymentReport')}>
        <Line label={t('reports.totalLabourCost')} value={money(data.labour.totalCost)} />
        <Line label={t('reports.amountPaid')} value={money(data.labour.amountPaid)} />
        <Line label={t('reports.remaining')} value={money(data.labour.remaining)} strong />
      </ReportCard>

      <ReportCard title={t('reports.harvestingReport')}>
        <Line label={t('reports.customers')} value={String(data.harvesting.totalCustomers)} />
        <Line label={t('reports.plotsHarvested')} value={String(data.harvesting.totalPlots)} />
        <Line label={t('reports.areaHarvested')} value={String(data.harvesting.totalArea)} />
        <Line label={t('reports.jobsCompleted')} value={String(data.harvesting.totalJobsCompleted)} />
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
