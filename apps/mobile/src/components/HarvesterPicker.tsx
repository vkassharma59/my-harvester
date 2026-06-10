import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ALL_HARVESTERS, HarvesterStatus } from '@wh/shared';
import { harvestersApi } from '@/api/endpoints';
import { useHarvesterAccess } from '@/hooks/useHarvesterAccess';
import { useSelectedHarvester } from '@/store/harvester';
import { colors, font, radius, spacing } from '@/theme';

/**
 * Toolbar shown at the top of harvester-scoped screens to switch the active
 * harvester (or "All Harvesters"). Rendered in screen content — not the native
 * header — so it isn't subject to iOS's translucent nav-bar button material.
 */
export function HarvesterPicker() {
  const [open, setOpen] = useState(false);
  const { selectedId, setSelected } = useSelectedHarvester();
  const { showPicker } = useHarvesterAccess();

  const { data: harvesters = [] } = useQuery({
    queryKey: ['harvesters', HarvesterStatus.ACTIVE],
    queryFn: () => harvestersApi.list(HarvesterStatus.ACTIVE),
  });

  // Staff with a single harvester don't need a switcher — it's auto-scoped.
  if (!showPicker) return null;

  const options = [
    { id: ALL_HARVESTERS, name: 'All Harvesters' },
    ...harvesters.map((h) => ({ id: h.id, name: h.name })),
  ];
  const current = options.find((o) => o.id === selectedId)?.name ?? 'All Harvesters';

  return (
    <View style={styles.bar}>
      <Text style={styles.barLabel}>Harvester</Text>

      <Pressable style={styles.chip} onPress={() => setOpen(true)}>
        <Text style={styles.chipText} numberOfLines={1}>
          {current}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Select harvester</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.id}
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    style={styles.row}
                    onPress={() => {
                      setSelected(item.id);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.name}</Text>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  barLabel: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.medium },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    maxWidth: 240,
  },
  chipText: { color: colors.primary, fontWeight: font.weight.semibold, fontSize: font.size.sm },
  caret: { color: colors.primary, marginLeft: spacing.xs },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '70%' },
  sheetTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: font.size.md, color: colors.text },
  rowTextActive: { color: colors.primary, fontWeight: font.weight.semibold },
  check: { color: colors.primary, fontSize: font.size.md },
});
