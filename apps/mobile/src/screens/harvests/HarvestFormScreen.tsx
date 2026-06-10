import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
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
import { HarvestsStackParamList } from '@/navigation/types';
import { scopedHarvesterId, useSelectedHarvester } from '@/store/harvester';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency, labelFromEnum } from '@/utils/format';

type Props = NativeStackScreenProps<HarvestsStackParamList, 'HarvestForm'>;

const TYPE_OPTIONS = Object.values(HarvestType).map((t) => ({ label: labelFromEnum(t), value: t }));
const UNIT_OPTIONS = Object.values(AreaUnit).map((u) => ({ label: labelFromEnum(u), value: u }));

export function HarvestFormScreen({ route, navigation }: Props) {
  const qc = useQueryClient();
  const plotId = route.params?.plotId;
  const editing = !!plotId;
  const selectedId = useSelectedHarvester((s) => s.selectedId);

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const { data: harvesters = [] } = useQuery({
    queryKey: ['harvesters', HarvesterStatus.ACTIVE],
    queryFn: () => harvestersApi.list(HarvesterStatus.ACTIVE),
  });
  const { data: customers } = useQuery({
    queryKey: ['customers', 'lookup'],
    queryFn: () => customersApi.list({ limit: 100 }),
  });
  const customerOptions = (customers?.items ?? []).map((c) => ({ label: c.name, value: c.id }));
  const harvesterOptions = harvesters.map((h) => ({ label: h.name, value: h.id }));

  const [customerId, setCustomerId] = useState('');
  const [harvesterId, setHarvesterId] = useState(scopedHarvesterId(selectedId) ?? '');
  const [plotName, setPlotName] = useState('');
  const [village, setVillage] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(AreaUnit.BIGHA);
  const [unitTouched, setUnitTouched] = useState(false);
  const [harvestDate, setHarvestDate] = useState(new Date());
  const [harvestType, setHarvestType] = useState<HarvestType>(HarvestType.PER_BIGHA_WITH_BHUSA);
  const [ratePerBigha, setRatePerBigha] = useState('');
  const [bhusaBuyerId, setBhusaBuyerId] = useState('');
  const [bhusaAmount, setBhusaAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [rateTouched, setRateTouched] = useState(false);

  const isWithoutBhusa = harvestType === HarvestType.WITHOUT_BHUSA;
  const selectedHarvester = harvesters.find((h) => h.id === harvesterId);
  const unit = labelFromEnum(areaUnit);

  const { data: existing } = useQuery({
    queryKey: ['plot', plotId],
    queryFn: () => plotsApi.get(plotId as string),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit job' : 'New harvesting job' });
  }, [editing, navigation]);

  // Default the area unit from settings (until the user changes it).
  useEffect(() => {
    if (!editing && !unitTouched && settings) setAreaUnit(settings.defaultAreaUnit);
  }, [settings, editing, unitTouched]);

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
      setVillage(existing.village ?? '');
      setArea(String(existing.area));
      setAreaUnit(existing.areaUnit);
      setUnitTouched(true);
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
    const bhusa = isWithoutBhusa ? Number(bhusaAmount) || 0 : 0;
    return { harvesting, bhusa, total: harvesting + bhusa };
  }, [area, ratePerBigha, bhusaAmount, isWithoutBhusa]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        customerId,
        harvesterId,
        plotName,
        village: village.trim() || undefined,
        area: Number(area),
        areaUnit,
        harvestDate: harvestDate.toISOString(),
        harvestType,
        ratePerBigha: Number(ratePerBigha),
        remarks: remarks.trim() || undefined,
        bhusaBuyerId: isWithoutBhusa && bhusaBuyerId ? bhusaBuyerId : undefined,
        bhusaAmount: isWithoutBhusa && bhusaAmount ? Number(bhusaAmount) : undefined,
      };
      return editing ? plotsApi.update(plotId as string, body) : plotsApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plots'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['customer-ledger'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!customerId) return Alert.alert('Required', 'Select a customer.');
    if (!harvesterId) return Alert.alert('Required', 'Select a harvester.');
    if (!plotName.trim()) return Alert.alert('Required', 'Enter a plot / land name.');
    if (!Number(area)) return Alert.alert('Required', 'Enter the area.');
    save.mutate();
  };

  return (
    <Screen>
      <Select
        label="Customer *"
        value={customerId}
        options={customerOptions}
        onChange={setCustomerId}
        placeholder="Select customer"
      />
      <Select
        label="Harvester *"
        value={harvesterId}
        options={harvesterOptions}
        onChange={setHarvesterId}
        placeholder="Select harvester"
      />
      <TextField label="Plot / Land name *" value={plotName} onChangeText={setPlotName} />
      <TextField label="Village" value={village} onChangeText={setVillage} />
      <TextField label="Area *" value={area} onChangeText={setArea} keyboardType="numeric" placeholder="e.g. 5" />
      <Select
        label="Area unit"
        value={areaUnit}
        options={UNIT_OPTIONS}
        onChange={(v) => {
          setUnitTouched(true);
          setAreaUnit(v as AreaUnit);
        }}
      />
      <DateField label="Harvest date" value={harvestDate} onChange={setHarvestDate} />
      <Select
        label="Harvesting type *"
        value={harvestType}
        options={TYPE_OPTIONS}
        onChange={(v) => setHarvestType(v as HarvestType)}
      />
      <AmountField
        label={`Rate per ${unit} *`}
        value={ratePerBigha}
        onChangeText={(v) => {
          setRateTouched(true);
          setRatePerBigha(v);
        }}
      />

      {isWithoutBhusa ? (
        <>
          <Select
            label="Bhusa buyer"
            value={bhusaBuyerId}
            options={customerOptions}
            onChange={setBhusaBuyerId}
            placeholder="Select buyer (optional)"
          />
          <AmountField label="Bhusa amount" value={bhusaAmount} onChangeText={setBhusaAmount} placeholder="0" />
        </>
      ) : null}

      <TextField label="Remarks" value={remarks} onChangeText={setRemarks} multiline />

      <View style={styles.preview}>
        <Row label="Harvesting amount" value={formatCurrency(preview.harvesting)} />
        {isWithoutBhusa ? <Row label="Bhusa sale" value={formatCurrency(preview.bhusa)} /> : null}
        <View style={styles.divider} />
        <Row label="Total" value={formatCurrency(preview.total)} bold />
      </View>

      <Button
        title={editing ? 'Save changes' : 'Add job'}
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
