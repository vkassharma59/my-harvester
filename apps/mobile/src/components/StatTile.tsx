import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';

interface StatTileProps {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative' | 'accent';
}

export function StatTile({ label, value, tone = 'default' }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, toneStyle[tone]]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const toneStyle = StyleSheet.create({
  default: { color: colors.text },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  accent: { color: colors.warning },
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: font.size.xs, color: colors.textMuted, marginBottom: spacing.xs },
  value: { fontSize: font.size.lg, fontWeight: font.weight.bold },
});
