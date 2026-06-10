import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';

export interface SelectOption {
  label: string;
  value: string;
  /** Optional secondary line, also matched when searching (e.g. a phone number). */
  description?: string;
}

interface SelectProps {
  label: string;
  value: string | undefined;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  /** Show a search box at the top of the sheet (matches label + description). */
  searchable?: boolean;
}

/**
 * A tap-to-open dropdown rendered as a bottom sheet (consistent on iOS/Android).
 * With `searchable`, a search box filters the options by label or description.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
  searchable,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => `${o.label} ${o.description ?? ''}`.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable style={[styles.box, error ? styles.boxError : null]} onPress={() => setOpen(true)}>
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.modalRoot}>
          {/* Backdrop sits BEHIND the sheet so it doesn't intercept the sheet's
              touches (which would block the search input / list on Android). */}
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={close} hitSlop={8}>
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>

            {searchable ? (
              <TextInput
                style={styles.search}
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or mobile"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
              />
            ) : null}

            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={styles.row}
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.label}</Text>
                      {item.description ? <Text style={styles.rowSub}>{item.description}</Text> : null}
                    </View>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
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

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
    maxHeight: '75%',
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
  search: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: font.size.md,
    color: colors.text,
  },
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
  rowSub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  rowTextActive: { color: colors.primary, fontWeight: font.weight.semibold },
  check: { color: colors.primary, fontSize: font.size.md, marginLeft: spacing.sm },
  empty: { fontSize: font.size.sm, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
});
