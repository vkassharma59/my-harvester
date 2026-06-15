import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PartyType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { customersApi, settingsApi } from '@/api/endpoints';
import { offlineCreate, offlineUpdate } from '@/offline/enqueue';
import { AmountField } from '@/components/AmountField';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateField } from '@/components/DateField';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { ErrorState, Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { useHarvestTypeLabel } from '@/hooks/useHarvestTypeLabel';
import { tEnum } from '@/i18n';
import { CustomersStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';

type Props = NativeStackScreenProps<CustomersStackParamList, 'CustomerLedger'>;

export function CustomerLedgerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const harvestTypeLabel = useHarvestTypeLabel();
  const { customerId } = route.params;
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [payOpen, setPayOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: () => customersApi.ledger(customerId),
  });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const areaUnit = settings?.defaultAreaUnit;
  // Names to label Bhusa records ("bought from <owner>").
  const { data: customerLookup } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => customersApi.list({ limit: 1000 }),
  });
  const ownerName = new Map((customerLookup?.items ?? []).map((c) => [c.id, c.name]));

  // Editable payment-reminder draft, prefilled from a template.
  const [reminder, setReminder] = useState('');
  useEffect(() => {
    if (!data) return;
    const firm = settings?.firmName?.trim();
    const signoff = firm
      ? t('customerLedger.reminderSignoffFirm', { firm })
      : t('customerLedger.reminderSignoff');
    setReminder(
      t('customerLedger.reminderTemplate', {
        name: data.customer.name,
        amount: formatCurrency(data.outstanding),
        link: t('customerLedger.paymentLinkPlaceholder'),
        signoff,
      }),
    );
  }, [data, settings, t]);

  const closeSheet = () => {
    setPayOpen(false);
    setEditingId(null);
    setAmount('');
    setDate(new Date());
    setNotes('');
    setAttachment('');
  };

  const onSaved = () => {
    closeSheet();
    qc.invalidateQueries({ queryKey: ['customer-ledger', customerId] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const recordPayment = useMutation({
    mutationFn: () => {
      offlineCreate('payment', {
        partyType: PartyType.CUSTOMER,
        partyId: customerId,
        amount: Number(amount),
        date: date.toISOString(),
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
        date: date.toISOString(),
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
    setDate(new Date());
    setNotes('');
    setAttachment('');
    setPayOpen(true);
  };

  const openEdit = (pay: { id: string; amount: number; date: string; notes?: string; attachmentUrl?: string }) => {
    setEditingId(pay.id);
    setAmount(String(pay.amount));
    setDate(new Date(pay.date));
    setNotes(pay.notes ?? '');
    setAttachment(pay.attachmentUrl ?? '');
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

  const editJob = (plotId: string) => navigation.navigate('HarvestForm', { plotId });

  if (isLoading) return <Loading />;
  // Show cached data even if the latest refetch failed (e.g. offline); only fall
  // back to the error screen when there's genuinely nothing to show.
  if (!data) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  const callCustomer = () => void Linking.openURL(`tel:${data.customer.phone}`).catch(() => {});
  const sendWhatsApp = () => {
    setReminderOpen(false);
    const digits = data.customer.phone.replace(/[^0-9]/g, '');
    const intl = digits.length === 10 ? `91${digits}` : digits; // assume India for 10-digit numbers
    Linking.openURL(`https://wa.me/${intl}?text=${encodeURIComponent(reminder)}`).catch(() =>
      Alert.alert(t('common.error'), t('customerLedger.whatsappError')),
    );
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Card>
        <View style={styles.cardActions}>
          <Pressable onPress={() => setReminderOpen(true)} hitSlop={10}>
            <Ionicons name="logo-whatsapp" size={24} color={colors.primary} />
          </Pressable>
          <Pressable onPress={callCustomer} hitSlop={10}>
            <Ionicons name="call" size={24} color={colors.primary} />
          </Pressable>
        </View>
        <Text style={styles.name}>{data.customer.name}</Text>
        <Text style={styles.sub}>{data.customer.phone}</Text>
        {data.customer.village ? <Text style={styles.sub}>{data.customer.village}</Text> : null}
        {data.customer.address ? <Text style={styles.sub}>{data.customer.address}</Text> : null}
        <Pressable onPress={() => navigation.navigate('CustomerForm', { customerId })} hitSlop={8}>
          <Text style={styles.editLink}>{t('customerLedger.editCustomer')}</Text>
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
      {data.plots.map((p) => {
        // This customer is a Bhusa buyer (not the plot owner) on this job.
        const isBhusaBuyer = p.bhusaBuyers?.length
          ? p.bhusaBuyers.some((b) => b.customerId === customerId)
          : p.bhusaBuyerId === customerId;
        const isBhusa = p.customerId !== customerId && isBhusaBuyer;
        const myBhusa = p.bhusaBuyers?.length
          ? p.bhusaBuyers.filter((b) => b.customerId === customerId).reduce((a, b) => a + b.amount, 0)
          : p.bhusaAmount ?? 0;
        return (
          <Card key={p.id} onPress={isBhusa ? undefined : () => editJob(p.id)}>
            <View style={styles.rowBetween}>
              <Text style={styles.plotName}>{p.plotName}</Text>
              <Text style={styles.plotAmount}>
                {formatCurrency(isBhusa ? myBhusa : p.harvestingAmount)}
              </Text>
            </View>
            {isBhusa ? (
              <Text style={styles.sub}>
                {t('customerLedger.bhusaFrom', { name: ownerName.get(p.customerId) ?? '' })}
              </Text>
            ) : null}
            <Text style={styles.sub}>
              {p.area} {tEnum('areaUnit', p.areaUnit)} · {formatDate(p.harvestDate)}
            </Text>
            {!isBhusa ? <Text style={styles.sub}>{harvestTypeLabel(p.harvesterId, p.harvestType)}</Text> : null}
            {p.remarks ? <Text style={styles.sub}>{p.remarks}</Text> : null}
            {!isBhusa ? <Text style={styles.editHint}>{t('customerLedger.editJob')}</Text> : null}
          </Card>
        );
      })}

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
            {pay.attachmentUrl ? (
              <Pressable onPress={() => void Linking.openURL(pay.attachmentUrl as string).catch(() => {})} hitSlop={6}>
                <Text style={styles.editLink}>{t('attachment.view')}</Text>
              </Pressable>
            ) : null}
            <Text style={styles.editHint}>{t('common.tapToEdit')}</Text>
          </Card>
        ))
      )}

      <Modal visible={reminderOpen} transparent animationType="slide" onRequestClose={() => setReminderOpen(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior="padding">
          <Pressable style={styles.backdrop} onPress={() => setReminderOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <Text style={styles.sheetTitle}>{t('customerLedger.reminderTitle')}</Text>
            <TextField
              label={t('customerLedger.reminderLabel')}
              value={reminder}
              onChangeText={setReminder}
              multiline
              style={styles.reminderInput}
            />
            <Button title={t('customerLedger.sendWhatsapp')} onPress={sendWhatsApp} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={payOpen} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior="padding">
          <Pressable style={styles.backdrop} onPress={closeSheet} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
            <Text style={styles.sheetTitle}>
              {editingId ? t('customerLedger.editPayment') : t('customerLedger.recordPaymentTitle')}
            </Text>
            <AmountField label={t('customerLedger.amount')} value={amount} onChangeText={setAmount} placeholder="0" />
            <DateField label={t('common.date')} value={date} onChange={setDate} />
            <TextField
              label={t('customerLedger.notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('common.optional')}
            />
            <AttachmentPicker value={attachment} onChange={setAttachment} />
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
  name: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text, paddingRight: 76 },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  editLink: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  cardActions: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    zIndex: 1,
  },
  reminderInput: { minHeight: 150, textAlignVertical: 'top' },
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
