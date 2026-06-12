import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { attendanceApi, labourApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Loading } from '@/components/States';
import { MoreStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

type Props = NativeStackScreenProps<MoreStackParamList, 'Attendance'>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Work in local date parts to avoid timezone drift on the 'YYYY-MM-DD' strings.
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() + 6) % 7));
};

export function AttendanceScreen({ route }: Props) {
  const { t } = useTranslation();
  const { labourId } = route.params;
  const qc = useQueryClient();

  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [present, setPresent] = useState<Set<string>>(new Set());

  const weekStartIso = ymd(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const weekEndIso = ymd(weekEnd);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: worker } = useQuery({
    queryKey: ['labour-one', labourId],
    queryFn: () => labourApi.list().then((list) => list.find((l) => l.id === labourId)),
  });
  const dailyWage = worker?.dailyWage ?? 0;

  const { data: presentDates, isLoading } = useQuery({
    queryKey: ['attendance', labourId, weekStartIso],
    queryFn: () => attendanceApi.getRange(labourId, weekStartIso, weekEndIso),
  });

  // Seed the editable set whenever a week's saved attendance loads.
  useEffect(() => {
    if (presentDates) setPresent(new Set(presentDates));
  }, [presentDates]);

  const toggle = (iso: string) =>
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });

  const setWholeWeek = (on: boolean) =>
    setPresent(on ? new Set(days.map(ymd)) : new Set());

  const save = useMutation({
    mutationFn: () => attendanceApi.setWeek(labourId, weekStartIso, [...present]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', labourId] });
      qc.invalidateQueries({ queryKey: ['labour-ledger', labourId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(t('attendance.savedTitle'), t('attendance.savedBody'));
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const presentCount = present.size;
  const weekWage = dailyWage * presentCount;
  const rangeLabel = `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  const thisMonday = ymd(mondayOf(new Date()));
  const prevMonday = ymd(addDays(mondayOf(new Date()), -7));

  return (
    <View style={styles.flex}>
      <Screen>
        <Card style={styles.navCard}>
          <View style={styles.rangeRow}>
            <Pressable onPress={() => setWeekStart((w) => addDays(w, -7))} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </Pressable>
            <Text style={styles.rangeText}>{rangeLabel}</Text>
            <Pressable onPress={() => setWeekStart((w) => addDays(w, 7))} hitSlop={10}>
              <Ionicons name="chevron-forward" size={24} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.quickRow}>
            <Pressable
              style={[styles.pill, weekStartIso === thisMonday && styles.pillActive]}
              onPress={() => setWeekStart(mondayOf(new Date()))}
            >
              <Text style={[styles.pillText, weekStartIso === thisMonday && styles.pillTextActive]}>
                {t('attendance.thisWeek')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.pill, weekStartIso === prevMonday && styles.pillActive]}
              onPress={() => setWeekStart(addDays(mondayOf(new Date()), -7))}
            >
              <Text style={[styles.pillText, weekStartIso === prevMonday && styles.pillTextActive]}>
                {t('attendance.previousWeek')}
              </Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('attendance.presentDays')}</Text>
            <Text style={styles.totalValue}>{t('attendance.daysCount', { count: presentCount })}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('attendance.weekWage')}</Text>
            <Text style={styles.wageValue}>{formatCurrency(weekWage)}</Text>
          </View>
          <Text style={styles.hint}>{t('attendance.rateHint', { rate: formatCurrency(dailyWage) })}</Text>
        </Card>

        {isLoading ? (
          <Loading />
        ) : (
          <View style={styles.daysRow}>
            {days.map((d, i) => {
              const iso = ymd(d);
              const on = present.has(iso);
              return (
                <Pressable key={iso} style={styles.dayCol} onPress={() => toggle(iso)}>
                  <Text style={styles.dayLabel}>{WEEKDAYS[i]}</Text>
                  <View style={[styles.dayCell, on && styles.dayCellOn]}>
                    {on ? (
                      <Ionicons name="checkmark" size={20} color={colors.white} />
                    ) : (
                      <Text style={styles.dayNum}>{d.getDate()}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.allRow}>
          <Pressable onPress={() => setWholeWeek(true)} hitSlop={6}>
            <Text style={styles.allLink}>{t('attendance.selectAll')}</Text>
          </Pressable>
          <Pressable onPress={() => setWholeWeek(false)} hitSlop={6}>
            <Text style={styles.allLink}>{t('attendance.clearAll')}</Text>
          </Pressable>
        </View>
      </Screen>
      <View style={styles.footer}>
        <Button title={t('attendance.save')} onPress={() => save.mutate()} loading={save.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  navCard: { gap: spacing.md },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangeText: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.semibold },
  pillTextActive: { color: colors.white },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  totalLabel: { fontSize: font.size.sm, color: colors.textMuted },
  totalValue: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text },
  wageValue: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.primary },
  hint: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.xs },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  dayCol: { alignItems: 'center', gap: spacing.xs },
  dayLabel: { fontSize: font.size.xs, color: colors.textMuted },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dayCellOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayNum: { fontSize: font.size.md, color: colors.text },
  allRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.lg },
  allLink: { fontSize: font.size.sm, color: colors.primary, fontWeight: font.weight.semibold },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
