import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PartyType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { fuelPumpsApi } from '@/api/endpoints';
import { offlineCreate, offlineUpdate } from '@/offline/enqueue';
import { AmountField } from '@/components/AmountField';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { ErrorState, Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { MoreStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';

type Props = NativeStackScreenProps<MoreStackParamList, 'FuelPumpLedger'>;

export function FuelPumpLedgerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { pumpId } = route.params;
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['fuel-pump-ledger', pumpId],
    queryFn: () => fuelPumpsApi.ledger(pumpId),
  });

  const closeSheet = () => {
    setPayOpen(false);
    setEditingId(null);
    setAmount('');
    setNotes('');
    setAttachment('');
  };

  const onSaved = () => {
    closeSheet();
    qc.invalidateQueries({ queryKey: ['fuel-pump-ledger', pumpId] });
  };

  const recordPayment = useMutation({
    mutationFn: () => {
      offlineCreate('payment', {
        partyType: PartyType.FUEL_PUMP,
        partyId: pumpId,
        amount: Number(amount),
        notes: notes.trim() || undefined,
        attachmentUrl: attachment,
      });
      return Promise.resolve();
    },
    onSuccess: onSaved,
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const updatePayment = useMutation({
    mutationFn: () => {
      offlineUpdate('payment', editingId!, {
        amount: Number(amount),
        notes: notes.trim() || undefined,
        attachmentUrl: attachment,
      });
      return Promise.resolve();
    },
    onSuccess: onSaved,
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const openRecord = () => {
    setEditingId(null);
    setAmount('');
    setNotes('');
    setAttachment('');
    setPayOpen(true);
  };

  const openEdit = (pay: { id: string; amount: number; notes?: string; attachmentUrl?: string }) => {
    setEditingId(pay.id);
    setAmount(String(pay.amount));
    setNotes(pay.notes ?? '');
    setAttachment(pay.attachmentUrl ?? '');
    setPayOpen(true);
  };

  const onSave = () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      Alert.alert(t('fuelPumpLedger.invalidTitle'), t('fuelPumpLedger.invalidAmount'));
      return;
    }
    if (editingId) updatePayment.mutate();
    else recordPayment.mutate();
  };

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  const p = data.pump;
  const call = () => p.phone && void Linking.openURL(`tel:${p.phone}`).catch(() => {});

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Card>
        {p.phone ? (
          <View style={styles.cardActions}>
            <Pressable onPress={call} hitSlop={10}>
              <Ionicons name="call" size={24} color={colors.primary} />
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.name}>{p.name}</Text>
        {p.phone ? <Text style={styles.sub}>{p.phone}</Text> : null}
        <Text style={styles.sub}>{t('fuelPumpLedger.harvestersServed', { count: p.harvesterIds.length })}</Text>
        <Pressable onPress={() => navigation.navigate('FuelPumpForm', { pumpId })} hitSlop={8}>
          <Text style={styles.editLink}>{t('fuelPumpLedger.editPump')}</Text>
        </Pressable>
      </Card>

      <View style={styles.grid}>
        <StatTile label={t('fuelPumpLedger.totalBill')} value={formatCurrency(data.totalBill)} tone="negative" />
        <StatTile label={t('fuelPumpLedger.amountPaid')} value={formatCurrency(data.amountPaid)} tone="positive" />
        <StatTile
          label={t('fuelPumpLedger.remaining')}
          value={formatCurrency(data.remaining)}
          tone={data.remaining > 0 ? 'accent' : 'positive'}
        />
      </View>

      <Button title={t('fuelPumpLedger.recordPayment')} onPress={openRecord} style={{ marginVertical: spacing.md }} />

      <Text style={styles.sectionTitle}>{t('fuelPumpLedger.paymentHistory', { count: data.payments.length })}</Text>
      {data.payments.length === 0 ? (
        <Text style={styles.sub}>{t('fuelPumpLedger.noPayments')}</Text>
      ) : (
        data.payments.map((pay) => (
          <Card key={pay.id} onPress={() => openEdit(pay)}>
            <View style={styles.rowBetween}>
              <Text style={styles.sub}>{formatDate(pay.date)}</Text>
              <Text style={styles.payAmount}>{formatCurrency(pay.amount)}</Text>
            </View>
            {pay.notes ? <Text style={styles.sub}>{pay.notes}</Text> : null}
            {pay.attachmentUrl ? (
              <Pressable onPress={() => void Linking.openURL(pay.attachmentUrl as string).catch(() => {})} hitSlop={6}>
                <Text style={styles.editLink}>{t('attachment.view')}</Text>
              </Pressable>
            ) : null}
            <Text style={styles.editHint}>{t('common.tapToEdit')}</Text>
          </Card>
        ))
      )}

      <Modal visible={payOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={closeSheet} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editingId ? t('fuelPumpLedger.editPayment') : t('fuelPumpLedger.recordPaymentTitle')}
            </Text>
            <AmountField label={t('fuelPumpLedger.amount')} value={amount} onChangeText={setAmount} placeholder="0" />
            <TextField
              label={t('fuelPumpLedger.notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('common.optional')}
            />
            <AttachmentPicker value={attachment} onChange={setAttachment} />
            <Button
              title={t('fuelPumpLedger.savePayment')}
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
  cardActions: { position: 'absolute', top: spacing.lg, right: spacing.lg, flexDirection: 'row', gap: spacing.lg, zIndex: 1 },
  name: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  editLink: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.primary, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payAmount: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.primary },
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
