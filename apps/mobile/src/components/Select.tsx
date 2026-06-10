import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label: string;
  value: string | undefined;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

/**
 * A tap-to-open dropdown. Instead of the platform <Picker> (which renders an
 * inline spinning wheel on iOS), this shows a field that opens a bottom sheet
 * of options — consistent on iOS and Android, and it slides up from the bottom
 * like the native iOS picker.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.box, error ? styles.boxError : null]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>No options available</Text>}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={styles.row}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.label}</Text>
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
  wrap: { marginBottom: spacing.md },
  label: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontWeight: font.weight.medium,
  },
  box: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boxError: { borderColor: colors.danger },
  value: { fontSize: font.size.md, color: colors.text, flex: 1 },
  placeholder: { color: colors.textMuted },
  caret: { fontSize: font.size.md, color: colors.textMuted, marginLeft: spacing.sm },
  error: { color: colors.danger, fontSize: font.size.xs, marginTop: spacing.xs },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
    maxHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text },
  done: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.primary },
  list: { paddingHorizontal: spacing.lg },
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
  empty: { fontSize: font.size.sm, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
});
