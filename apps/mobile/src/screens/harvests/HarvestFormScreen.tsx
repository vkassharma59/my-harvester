import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AreaUnit, HarvesterStatus, HarvesterType, HarvestType } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { customersApi, harvestersApi, plotsApi, settingsApi } from '@/api/endpoints';
import { AmountField } from '@/components/AmountField';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { TextField } from '@/components/TextField';
import { useHarvesterAccess } from '@/hooks/useHarvesterAccess';
import { tEnum } from '@/i18n';
import { HarvestsStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

type Props = NativeStackScreenProps<HarvestsStackParamList, 'HarvestForm'>;

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
    }
  }, [existing]);

  const preview = useMemo(() => {
    const a = Number(area) || 0;
    const r = Number(ratePerBigha) || 0;
    const harvesting = Math.round(a * r * 100) / 100;
    const bhusa = showBhusa ? Number(bhusaAmount) || 0 : 0;
    return { harvesting, bhusa, total: harvesting + bhusa };
  }, [area, ratePerBigha, bhusaAmount, showBhusa]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        customerId,
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
      };
      return editing ? plotsApi.update(plotId as string, body) : plotsApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plots'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['customer-ledger'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!customerId) return Alert.alert(t('harvestForm.required'), t('harvestForm.selectCustomer'));
    if (!harvesterId) return Alert.alert(t('harvestForm.required'), t('harvestForm.selectHarvester'));
    if (!plotName.trim()) return Alert.alert(t('harvestForm.required'), t('harvestForm.enterPlot'));
    if (!Number(area)) return Alert.alert(t('harvestForm.required'), t('harvestForm.enterArea'));
    save.mutate();
  };

  return (
    <Screen>
      <Select
        label={t('harvestForm.customerLabel')}
        value={customerId}
        options={customerOptions}
        onChange={setCustomerId}
        placeholder={t('harvestForm.customerPlaceholder')}
        searchable
      />
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
      <TextField
        label={t('harvestForm.areaLabel', { unit })}
        value={area}
        onChangeText={setArea}
        keyboardType="numeric"
        placeholder={t('harvestForm.areaPlaceholder')}
      />
      <DateField label={t('harvestForm.harvestDate')} value={harvestDate} onChange={setHarvestDate} />

      {isBhusaHarvester ? (
        <Select
          label={t('harvestForm.harvestTypeLabel')}
          value={harvestType}
          options={TYPE_OPTIONS}
          onChange={(v) => setHarvestType(v as HarvestType)}
        />
      ) : null}

      <AmountField
        label={t('harvestForm.rateLabel', { unit })}
        value={ratePerBigha}
        onChangeText={(v) => {
          setRateTouched(true);
          setRatePerBigha(v);
        }}
      />

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

      <TextField label={t('harvestForm.remarksLabel')} value={remarks} onChangeText={setRemarks} multiline />

      <View style={styles.preview}>
        <Row label={t('harvestForm.harvestingAmount')} value={formatCurrency(preview.harvesting)} />
        {showBhusa ? <Row label={t('harvestForm.bhusaSale')} value={formatCurrency(preview.bhusa)} /> : null}
        <View style={styles.divider} />
        <Row label={t('harvestForm.total')} value={formatCurrency(preview.total)} bold />
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowLabel: { fontSize: font.size.sm, color: colors.textMuted },
  rowValue: { fontSize: font.size.sm, color: colors.text },
  bold: { fontWeight: font.weight.bold, color: colors.primary, fontSize: font.size.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
