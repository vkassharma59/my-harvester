import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsOnline } from '@/offline/connectivity';
import { pendingCount, useOutbox } from '@/offline/outbox';
import { colors, font, spacing } from '@/theme';

/**
 * Thin status strip shown only when offline or when there are unsynced changes,
 * so users know their offline entries are saved and will sync.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const pending = useOutbox(pendingCount);

  if (online && pending === 0) return null;

  const message = !online
    ? pending > 0
      ? t('offline.offlineWithPending', { count: pending })
      : t('offline.offline')
    : t('offline.syncing', { count: pending });

  return (
    <View style={[styles.bar, { paddingBottom: spacing.xs + insets.bottom }, online ? styles.syncing : styles.offline]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingTop: spacing.xs, paddingHorizontal: spacing.lg, alignItems: 'center' },
  offline: { backgroundColor: colors.danger },
  syncing: { backgroundColor: colors.warning },
  text: { color: colors.white, fontSize: font.size.xs, fontWeight: font.weight.semibold },
});
