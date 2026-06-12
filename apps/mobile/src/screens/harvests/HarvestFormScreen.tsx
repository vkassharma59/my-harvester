import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AreaUnit, HarvesterStatus, HarvesterType, HarvestType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { agentsApi, customersApi, harvestersApi, plotsApi, settingsApi } from '@/api/endpoints';
import { AmountField } from '@/components/AmountField';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { useHarvesterAccess } from '@/hooks/useHarvesterAccess';
import { tEnum } from '@/i18n';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

// Registered in both the Harvests and Customers stacks, so keep the param list local.
type HarvestFormParamList = { HarvestForm: { plotId?: string } | undefined };
type Props = NativeStackScreenProps<HarvestFormParamList, 'HarvestForm'>;

export function HarvestFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const TYPE_OPTIONS = Object.values(HarvestType).map((v) => ({ label: tEnum('harvestType', v), value: v }));
  const plotId = route.params?.plotId;
  const editing = !!plotId;
  const selectedId = useSelectedHarvester((s) => s.selectedId);
  const { soleHarvesterId } = useHarvesterAccess();

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const { data: harvesters = [] } = useQuery({
    queryKey: ['harvesters', HarvesterStatus.ACTIVE],
    queryFn: () => harvestersApi.list(HarvesterStatus.ACTIVE),
  });
  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customerOptions = (customers?.items ?? []).map((c) => ({
    label: c.name,
    value: c.id,
    description: [c.phone, c.village].filter(Boolean).join(' · '),
  }));
  const harvesterOptions = harvesters.map((h) => ({ label: h.name, value: h.id }));

  const [customerId, setCustomerId] = useState('');
  const [harvesterId, setHarvesterId] = useState(scopedHarvesterId(selectedId) ?? '');
  const [plotName, setPlotName] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(AreaUnit.BIGHA);
  const [harvestDate, setHarvestDate] = useState(new Date());
  const [harvestType, setHarvestType] = useState<HarvestType>(HarvestType.PER_BIGHA_WITH_BHUSA);
  const [ratePerBigha, setRatePerBigha] = useState('');
  const [bhusaBuyerId, setBhusaBuyerId] = useState('');
  const [bhusaAmount, setBhusaAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [rateTouched, setRateTouched] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [agentId, setAgentId] = useState('');
  // A customer imported from contacts that isn't in the DB yet — created on save.
  const [importedCustomer, setImportedCustomer] = useState<{ name: string; phone: string; deviceContactId?: string } | null>(null);

  // Commission agents for the chosen harvester (the list includes inactive ones).
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', harvesterId],
    queryFn: () => agentsApi.list(harvesterId || undefined),
    enabled: !!harvesterId,
  });
  // Only active agents are selectable, plus the agent already on this job (so
  // editing an old job keeps its agent even if it was later deactivated).
  const assignedAgent = agents.find((a) => a.id === agentId);
  const agentChoices =
    assignedAgent && !assignedAgent.isActive
      ? [assignedAgent, ...agents.filter((a) => a.isActive)]
      : agents.filter((a) => a.isActive);
  const agentOptions = agentChoices.map((a) => ({
    label: a.name,
    value: a.id,
    description: `${formatCurrency(a.commissionRate)} ${t('agents.perUnit')}`,
  }));
  const selectedAgent = assignedAgent;

  const selectedHarvester = harvesters.find((h) => h.id === harvesterId);
  // Bhusa-specific fields only apply to Bhusa harvesters.
  const isBhusaHarvester = selectedHarvester?.type === HarvesterType.BHUSA;
  const showBhusa = isBhusaHarvester && harvestType === HarvestType.WITHOUT_BHUSA;
  // For Combine harvesters there's no "with/without Bhusa" choice.
  const effectiveHarvestType = isBhusaHarvester ? harvestType : HarvestType.PER_BIGHA_WITH_BHUSA;
  const unit = tEnum('areaUnit', areaUnit);

  const { data: existing } = useQuery({
    queryKey: ['plot', plotId],
    queryFn: () => plotsApi.get(plotId as string),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? t('harvestForm.titleEdit') : t('harvestForm.titleNew') });
  }, [editing, navigation, t]);

  // Staff with a single harvester: auto-select it (dropdown is hidden).
  useEffect(() => {
    if (!editing && soleHarvesterId) setHarvesterId(soleHarvesterId);
  }, [editing, soleHarvesterId]);

  // Area unit always follows the configured default (Bigha / Acre).
  useEffect(() => {
    if (!editing && settings) setAreaUnit(settings.defaultAreaUnit);
  }, [settings, editing]);

  // Default the rate from the chosen harvester's rate for this harvest type.
  useEffect(() => {
    if (editing || rateTouched || !selectedHarvester) return;
    const rate =
      selectedHarvester.type === HarvesterType.COMBINE
        ? selectedHarvester.ratePerUnit
        : harvestType === HarvestType.PER_BIGHA_WITH_BHUSA
          ? selectedHarvester.rateWithBhusa
          : selectedHarvester.rateWithoutBhusa;
    setRatePerBigha(rate != null ? String(rate) : '');
  }, [selectedHarvester, harvestType, editing, rateTouched]);

  useEffect(() => {
    if (existing) {
      setCustomerId(existing.customerId);
      setHarvesterId(existing.harvesterId);
      setPlotName(existing.plotName);
      setArea(String(existing.area));
      setAreaUnit(existing.areaUnit);
      setHarvestDate(new Date(existing.harvestDate));
      setHarvestType(existing.harvestType);
      setRatePerBigha(String(existing.ratePerBigha));
      setRateTouched(true);
      setBhusaBuyerId(existing.bhusaBuyerId ?? '');
      setBhusaAmount(existing.bhusaAmount != null ? String(existing.bhusaAmount) : '');
      setRemarks(existing.remarks ?? '');
      setAgentEnabled(!!existing.agentId);
      setAgentId(existing.agentId ?? '');
    }
  }, [existing]);

  // When the toggle is on and the harvester has exactly one active agent, auto-select it.
  useEffect(() => {
    if (!agentEnabled) return;
    const active = agents.filter((a) => a.isActive);
    if (active.length === 1 && !agentId) setAgentId(active[0].id);
  }, [agentEnabled, agents, agentId]);

  // Drop a selected agent that no longer belongs to the chosen harvester.
  useEffect(() => {
    if (agentId && agents.length && !agents.some((a) => a.id === agentId)) setAgentId('');
  }, [agents, agentId]);

  const preview = useMemo(() => {
    const a = Number(area) || 0;
    const r = Number(ratePerBigha) || 0;
    const harvesting = Math.round(a * r * 100) / 100;
    const bhusa = showBhusa ? Number(bhusaAmount) || 0 : 0;
    return { harvesting, bhusa, total: harvesting + bhusa };
  }, [area, ratePerBigha, bhusaAmount, showBhusa]);

  const commission =
    agentEnabled && selectedAgent
      ? Math.round((Number(area) || 0) * selectedAgent.commissionRate * 100) / 100
      : 0;

  // Pick a customer from contacts: reuse an existing one (matched by phone) or
  // stage a new customer that gets created when the job is saved.
  const importCustomer = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('harvestForm.permissionNeeded'), t('harvestForm.permissionMessage'));
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const phone = (contact.phoneNumbers?.[0]?.number ?? '').replace(/[^0-9]/g, '').slice(-10);
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || contact.name || '';
      if (!phone) {
        Alert.alert(t('harvestForm.required'), t('harvestForm.contactNeedsPhone'));
        return;
      }
      const existing = (customers?.items ?? []).find((c) => c.phone === phone);
      if (existing) {
        setCustomerId(existing.id);
        setImportedCustomer(null);
      } else {
        setImportedCustomer({ name: name || phone, phone, deviceContactId: contact.id });
        setCustomerId('');
      }
    } catch (e) {
      Alert.alert(t('harvestForm.contactsError'), apiErrorMessage(e));
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      // Create the imported customer first so the job can reference it.
      let cId = customerId;
      if (!cId && importedCustomer) {
        const created = await customersApi.create({
          name: importedCustomer.name,
          phone: importedCustomer.phone,
          deviceContactId: importedCustomer.deviceContactId,
        });
        cId = created.id;
      }
      const body = {
        customerId: cId,
        harvesterId,
        plotName,
        area: Number(area),
        areaUnit,
        harvestDate: harvestDate.toISOString(),
        harvestType: effectiveHarvestType,
        ratePerBigha: Number(ratePerBigha),
        remarks: remarks.trim() || undefined,
        bhusaBuyerId: showBhusa && bhusaBuyerId ? bhusaBuyerId : undefined,
        bhusaAmount: showBhusa && bhusaAmount ? Number(bhusaAmount) : undefined,
        agentId: agentEnabled && agentId ? agentId : null,
      };
      return editing ? plotsApi.update(plotId as string, body) : plotsApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plots'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['customer-ledger'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!customerId && !importedCustomer)
      return Alert.alert(t('harvestForm.required'), t('harvestForm.selectCustomer'));
    if (!harvesterId) return Alert.alert(t('harvestForm.required'), t('harvestForm.selectHarvester'));
    if (!plotName.trim()) return Alert.alert(t('harvestForm.required'), t('harvestForm.enterPlot'));
    if (!Number(area)) return Alert.alert(t('harvestForm.required'), t('harvestForm.enterArea'));
    save.mutate();
  };

  return (
    <Screen>
      <View style={styles.customerRow}>
        <View style={styles.customerSelect}>
          <Select
            label={t('harvestForm.customerLabel')}
            value={customerId}
            options={customerOptions}
            onChange={(v) => {
              setCustomerId(v);
              setImportedCustomer(null);
            }}
            placeholder={t('harvestForm.customerPlaceholder')}
            searchable
          />
        </View>
        <Pressable
          onPress={importCustomer}
          hitSlop={10}
          style={styles.contactIconBtn}
          accessibilityLabel={t('harvestForm.importCustomer')}
        >
          <Ionicons name="person-add-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>
      {importedCustomer ? (
        <View style={styles.newCustomerBox}>
          <Text style={styles.newCustomerText} numberOfLines={1}>
            {t('harvestForm.newCustomer')}: {importedCustomer.name} · {importedCustomer.phone}
          </Text>
          <Pressable onPress={() => setImportedCustomer(null)} hitSlop={8}>
            <Text style={styles.newCustomerClear}>✕</Text>
          </Pressable>
        </View>
      ) : null}
      {!soleHarvesterId ? (
        <Select
          label={t('harvestForm.harvesterLabel')}
          value={harvesterId}
          options={harvesterOptions}
          onChange={setHarvesterId}
          placeholder={t('harvestForm.harvesterPlaceholder')}
        />
      ) : null}
      <TextField label={t('harvestForm.plotLabel')} value={plotName} onChangeText={setPlotName} />
      <View style={styles.fieldRow}>
        <View style={styles.fieldHalf}>
          <TextField
            label={t('harvestForm.areaLabel', { unit })}
            value={area}
            onChangeText={setArea}
            keyboardType="numeric"
            placeholder={t('harvestForm.areaPlaceholder')}
          />
        </View>
        <View style={styles.fieldHalf}>
          <AmountField
            label={t('harvestForm.rateLabel', { unit })}
            value={ratePerBigha}
            onChangeText={(v) => {
              setRateTouched(true);
              setRatePerBigha(v);
            }}
          />
        </View>
      </View>
      <DateField label={t('harvestForm.harvestDate')} value={harvestDate} onChange={setHarvestDate} />

      {isBhusaHarvester ? (
        <Select
          label={t('harvestForm.harvestTypeLabel')}
          value={harvestType}
          options={TYPE_OPTIONS}
          onChange={(v) => setHarvestType(v as HarvestType)}
        />
      ) : null}

      {showBhusa ? (
        <>
          <Select
            label={t('harvestForm.bhusaBuyerLabel')}
            value={bhusaBuyerId}
            options={customerOptions}
            onChange={setBhusaBuyerId}
            placeholder={t('harvestForm.bhusaBuyerPlaceholder')}
            searchable
          />
          <AmountField label={t('harvestForm.bhusaAmountLabel')} value={bhusaAmount} onChangeText={setBhusaAmount} placeholder="0" />
        </>
      ) : null}

      <TextField
        label={t('harvestForm.remarksLabel')}
        value={remarks}
        onChangeText={setRemarks}
        placeholder={t('harvestForm.remarksPlaceholder')}
        multiline
      />

      {agentChoices.length >= 1 ? (
        <View style={styles.agentBox}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('harvestForm.agentApplicable')}</Text>
            <Switch
              value={agentEnabled}
              onValueChange={setAgentEnabled}
              trackColor={{ true: colors.primaryLight, false: colors.border }}
              thumbColor={agentEnabled ? colors.primary : colors.surface}
            />
          </View>
          {agentEnabled && agentChoices.length > 1 ? (
            <Select
              label={t('harvestForm.agentLabel')}
              value={agentId}
              options={agentOptions}
              onChange={setAgentId}
              placeholder={t('harvestForm.agentPlaceholder')}
            />
          ) : null}
          {agentEnabled && agentChoices.length === 1 ? (
            <Text style={styles.agentSingle}>
              {agentChoices[0].name} · {formatCurrency(agentChoices[0].commissionRate)} {t('agents.perUnit')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.preview}>
        <Row label={t('harvestForm.harvestingAmount')} value={formatCurrency(preview.harvesting)} />
        {showBhusa ? <Row label={t('harvestForm.bhusaSale')} value={formatCurrency(preview.bhusa)} /> : null}
        <View style={styles.divider} />
        <Row label={t('harvestForm.total')} value={formatCurrency(preview.total)} bold />
        {agentEnabled && selectedAgent ? (
          <Row label={t('harvestForm.agentCommission')} value={formatCurrency(commission)} />
        ) : null}
      </View>

      <Button
        title={editing ? t('harvestForm.saveChanges') : t('harvestForm.addJob')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  fieldRow: { flexDirection: 'row', gap: spacing.md },
  fieldHalf: { flex: 1 },
  customerRow: { flexDirection: 'row', alignItems: 'flex-end' },
  customerSelect: { flex: 1 },
  contactIconBtn: { paddingLeft: spacing.md, marginBottom: spacing.lg },
  newCustomerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  newCustomerText: { flex: 1, fontSize: font.size.sm, color: colors.text, paddingRight: spacing.sm },
  newCustomerClear: { fontSize: font.size.md, color: colors.textMuted, fontWeight: font.weight.bold },
  agentBox: { marginTop: spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontSize: font.size.md, color: colors.text, fontWeight: font.weight.medium, flex: 1, paddingRight: spacing.md },
  agentSingle: { fontSize: font.size.sm, color: colors.textMuted, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowLabel: { fontSize: font.size.sm, color: colors.textMuted },
  rowValue: { fontSize: font.size.sm, color: colors.text },
  bold: { fontWeight: font.weight.bold, color: colors.primary, fontSize: font.size.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
