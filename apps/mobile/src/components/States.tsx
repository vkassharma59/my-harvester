import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '@/theme';
import { Button } from './Button';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: colors.danger }]}>Something went wrong</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? <Button title="Retry" variant="secondary" onPress={onRetry} style={styles.retry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  muted: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center' },
  retry: { marginTop: spacing.md, minWidth: 140 },
});
