import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { PartyType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { customersApi, paymentsApi } from '@/api/endpoints';
import { AmountField } from '@/components/AmountField';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { ErrorState, Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { CustomersStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency, formatDate, labelFromEnum } from '@/utils/format';

type Props = NativeStackScreenProps<CustomersStackParamList, 'CustomerLedger'>;

export function CustomerLedgerScreen({ route }: Props) {
  const { customerId } = route.params;
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: () => customersApi.ledger(customerId),
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      paymentsApi.create({
        partyType: PartyType.CUSTOMER,
        partyId: customerId,
        amount: Number(amount),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setPayOpen(false);
      setAmount('');
      setNotes('');
      qc.invalidateQueries({ queryKey: ['customer-ledger', customerId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const onRecord = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      Alert.alert('Invalid', 'Enter a payment amount greater than zero.');
      return;
    }
    recordPayment.mutate();
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
      </Card>

      <View style={styles.grid}>
        <StatTile label="Total Bill" value={formatCurrency(data.totalBillAmount)} />
        <StatTile label="Amount Paid" value={formatCurrency(data.amountPaid)} tone="positive" />
        <StatTile
          label="Outstanding"
          value={formatCurrency(data.outstanding)}
          tone={data.outstanding > 0 ? 'negative' : 'positive'}
        />
        <StatTile label="Total Area" value={String(data.totalHarvestedArea)} />
      </View>

      <Button title="+ Record payment" onPress={() => setPayOpen(true)} style={{ marginVertical: spacing.md }} />

      <Text style={styles.sectionTitle}>Harvesting records ({data.plots.length})</Text>
      {data.plots.map((p) => (
        <Card key={p.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.plotName}>{p.plotName}</Text>
            <Text style={styles.plotAmount}>{formatCurrency(p.harvestingAmount)}</Text>
          </View>
          <Text style={styles.sub}>
            {p.area} {labelFromEnum(p.areaUnit)} · {formatDate(p.harvestDate)}
          </Text>
          <Text style={styles.sub}>{labelFromEnum(p.harvestType)}</Text>
          {p.remarks ? <Text style={styles.sub}>{p.remarks}</Text> : null}
        </Card>
      ))}

      <Text style={styles.sectionTitle}>Payment history ({data.payments.length})</Text>
      {data.payments.length === 0 ? (
        <Text style={styles.sub}>No payments recorded.</Text>
      ) : (
        data.payments.map((pay) => (
          <Card key={pay.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>{formatDate(pay.date)}</Text>
              <Text style={styles.plotAmount}>{formatCurrency(pay.amount)}</Text>
            </View>
            {pay.notes ? <Text style={styles.sub}>{pay.notes}</Text> : null}
          </Card>
        ))
      )}

      <Modal visible={payOpen} transparent animationType="slide" onRequestClose={() => setPayOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPayOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Record payment</Text>
            <AmountField label="Amount" value={amount} onChangeText={setAmount} placeholder="0" />
            <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
            <Button title="Save payment" onPress={onRecord} loading={recordPayment.isPending} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text, marginBottom: spacing.md },
});
