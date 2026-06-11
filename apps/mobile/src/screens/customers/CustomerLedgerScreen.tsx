import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PartyType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { customersApi, paymentsApi, settingsApi } from '@/api/endpoints';
import { AmountField } from '@/components/AmountField';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { ErrorState, Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { useHarvestTypeLabel } from '@/hooks/useHarvestTypeLabel';
import { tEnum } from '@/i18n';
import { AppTabsParamList, CustomersStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';

type Props = NativeStackScreenProps<CustomersStackParamList, 'CustomerLedger'>;

export function CustomerLedgerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const harvestTypeLabel = useHarvestTypeLabel();
  const { customerId } = route.params;
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: () => customersApi.ledger(customerId),
  });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const areaUnit = settings?.defaultAreaUnit;

  const closeSheet = () => {
    setPayOpen(false);
    setEditingId(null);
    setAmount('');
    setNotes('');
  };

  const onSaved = () => {
    closeSheet();
    qc.invalidateQueries({ queryKey: ['customer-ledger', customerId] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const recordPayment = useMutation({
    mutationFn: () =>
      paymentsApi.create({
        partyType: PartyType.CUSTOMER,
        partyId: customerId,
        amount: Number(amount),
        notes: notes.trim() || undefined,
      }),
    onSuccess: onSaved,
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const updatePayment = useMutation({
    mutationFn: () =>
      paymentsApi.update(editingId!, {
        amount: Number(amount),
        notes: notes.trim() || undefined,
      }),
    onSuccess: onSaved,
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const openRecord = () => {
    setEditingId(null);
    setAmount('');
    setNotes('');
    setPayOpen(true);
  };

  const openEdit = (pay: { id: string; amount: number; notes?: string }) => {
    setEditingId(pay.id);
    setAmount(String(pay.amount));
    setNotes(pay.notes ?? '');
    setPayOpen(true);
  };

  const onSave = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      Alert.alert(t('customerLedger.invalidTitle'), t('customerLedger.invalidAmount'));
      return;
    }
    if (editingId) updatePayment.mutate();
    else recordPayment.mutate();
  };

  const viewHarvestingJobs = () => {
    if (!data) return;
    navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>()?.navigate('HarvestsTab', {
      screen: 'HarvestsList',
      params: { customerId, customerName: data.customer.name },
    });
  };

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Card>
        <Text style={styles.name}>{data.customer.name}</Text>
        <Text style={styles.sub}>{data.customer.phone}</Text>
        {data.customer.village ? <Text style={styles.sub}>{data.customer.village}</Text> : null}
        {data.customer.address ? <Text style={styles.sub}>{data.customer.address}</Text> : null}
        <Pressable onPress={viewHarvestingJobs} hitSlop={8}>
          <Text style={styles.jobsLink}>{t('customerLedger.viewJobs')}</Text>
        </Pressable>
      </Card>

      <View style={styles.grid}>
        <StatTile label={t('customerLedger.totalBill')} value={formatCurrency(data.totalBillAmount)} />
        <StatTile label={t('customerLedger.amountPaid')} value={formatCurrency(data.amountPaid)} tone="positive" />
        <StatTile
          label={t('customerLedger.outstanding')}
          value={formatCurrency(data.outstanding)}
          tone={data.outstanding > 0 ? 'negative' : 'positive'}
        />
        <StatTile
          label={t('customerLedger.totalArea')}
          value={areaUnit ? `${data.totalHarvestedArea} ${tEnum('areaUnit', areaUnit)}` : String(data.totalHarvestedArea)}
        />
      </View>

      <Button title={t('customerLedger.recordPayment')} onPress={openRecord} style={{ marginVertical: spacing.md }} />

      <Text style={styles.sectionTitle}>{t('customerLedger.harvestingRecords', { count: data.plots.length })}</Text>
      {data.plots.map((p) => (
        <Card key={p.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.plotName}>{p.plotName}</Text>
            <Text style={styles.plotAmount}>{formatCurrency(p.harvestingAmount)}</Text>
          </View>
          <Text style={styles.sub}>
            {p.area} {tEnum('areaUnit', p.areaUnit)} · {formatDate(p.harvestDate)}
          </Text>
          <Text style={styles.sub}>{harvestTypeLabel(p.harvesterId, p.harvestType)}</Text>
          {p.remarks ? <Text style={styles.sub}>{p.remarks}</Text> : null}
        </Card>
      ))}

      <Text style={styles.sectionTitle}>{t('customerLedger.paymentHistory', { count: data.payments.length })}</Text>
      {data.payments.length === 0 ? (
        <Text style={styles.sub}>{t('customerLedger.noPayments')}</Text>
      ) : (
        data.payments.map((pay) => (
          <Card key={pay.id} onPress={() => openEdit(pay)}>
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>{formatDate(pay.date)}</Text>
              <Text style={styles.plotAmount}>{formatCurrency(pay.amount)}</Text>
            </View>
            {pay.notes ? <Text style={styles.sub}>{pay.notes}</Text> : null}
            <Text style={styles.editHint}>{t('common.tapToEdit')}</Text>
          </Card>
        ))
      )}

      <Modal visible={payOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={closeSheet} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editingId ? t('customerLedger.editPayment') : t('customerLedger.recordPaymentTitle')}
            </Text>
            <AmountField label={t('customerLedger.amount')} value={amount} onChangeText={setAmount} placeholder="0" />
            <TextField
              label={t('customerLedger.notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('common.optional')}
            />
            <Button
              title={t('customerLedger.savePayment')}
              onPress={onSave}
              loading={recordPayment.isPending || updatePayment.isPending}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  jobsLink: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plotName: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  plotAmount: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.primary },
  editHint: { fontSize: font.size.xs, color: colors.primary, marginTop: spacing.xs, textAlign: 'right' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text, marginBottom: spacing.md },
});
