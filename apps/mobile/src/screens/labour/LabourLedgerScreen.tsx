import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LabourType, PartyType, WageType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { labourApi, paymentsApi } from '@/api/endpoints';
import { AmountField } from '@/components/AmountField';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { ErrorState, Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { tEnum } from '@/i18n';
import { MoreStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';

type Props = NativeStackScreenProps<MoreStackParamList, 'LabourLedger'>;

export function LabourLedgerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { labourId } = route.params;
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['labour-ledger', labourId],
    queryFn: () => labourApi.ledger(labourId),
  });

  const closeSheet = () => {
    setPayOpen(false);
    setEditingId(null);
    setAmount('');
    setNotes('');
  };

  const onSaved = () => {
    closeSheet();
    qc.invalidateQueries({ queryKey: ['labour-ledger', labourId] });
  };

  const recordPayment = useMutation({
    mutationFn: () =>
      paymentsApi.create({
        partyType: PartyType.LABOUR,
        partyId: labourId,
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
      Alert.alert(t('labourLedger.invalidTitle'), t('labourLedger.invalidAmount'));
      return;
    }
    if (editingId) updatePayment.mutate();
    else recordPayment.mutate();
  };

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  const w = data.labour;
  const isFixed = w.wageType === WageType.FIXED;
  const call = () => void Linking.openURL(`tel:${w.mobile}`).catch(() => {});
  const typeLabel =
    w.type === LabourType.OTHER && w.customType ? w.customType : tEnum('labourType', w.type);
  const wageLine =
    w.wageType === WageType.FIXED
      ? t('labourLedger.fixedWage', { amount: formatCurrency(w.customAmount ?? 0) })
      : t('labourLedger.dailyWageLine', { amount: formatCurrency(w.dailyWage ?? 0) });

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{w.name}</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={call} hitSlop={10}>
              <Ionicons name="call" size={24} color={colors.primary} />
            </Pressable>
            {!isFixed ? (
              <Pressable
                onPress={() => navigation.navigate('Attendance', { labourId, name: w.name })}
                hitSlop={10}
              >
                <Ionicons name="time-outline" size={26} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text style={styles.sub}>
          {typeLabel} · {w.mobile}
        </Text>
        <Text style={styles.sub}>{wageLine}</Text>
        {!isFixed ? (
          <Pressable onPress={() => navigation.navigate('Attendance', { labourId, name: w.name })} hitSlop={8}>
            <Text style={styles.editLink}>{t('labourLedger.markAttendance')}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => navigation.navigate('LabourForm', { labourId })} hitSlop={8}>
          <Text style={styles.editLink}>{t('labourLedger.editWorker')}</Text>
        </Pressable>
      </Card>

      <View style={styles.grid}>
        <StatTile label={t('labourLedger.totalBill')} value={formatCurrency(data.totalBill)} />
        <StatTile label={t('labourLedger.amountPaid')} value={formatCurrency(data.amountPaid)} tone="positive" />
        <StatTile
          label={t('labourLedger.remaining')}
          value={formatCurrency(data.remaining)}
          tone={data.remaining > 0 ? 'negative' : 'positive'}
        />
        <StatTile label={t('labourLedger.workingDays')} value={String(data.totalWorkingDays)} />
      </View>

      <Button title={t('labourLedger.recordPayment')} onPress={openRecord} style={{ marginVertical: spacing.md }} />

      <Text style={styles.sectionTitle}>{t('labourLedger.paymentHistory', { count: data.payments.length })}</Text>
      {data.payments.length === 0 ? (
        <Text style={styles.sub}>{t('labourLedger.noPayments')}</Text>
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
              {editingId ? t('labourLedger.editPayment') : t('labourLedger.recordPaymentTitle')}
            </Text>
            <AmountField label={t('labourLedger.amount')} value={amount} onChangeText={setAmount} placeholder="0" />
            <TextField
              label={t('labourLedger.notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('common.optional')}
            />
            <Button
              title={t('labourLedger.savePayment')}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  name: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  editLink: {
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
