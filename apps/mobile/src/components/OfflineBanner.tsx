import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsOnline } from '@/offline/connectivity';
import { pendingCount, useOutbox } from '@/offline/outbox';
import { useOfflinePrefs } from '@/offline/prefs';
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
  const offlineEntryEnabled = useOfflinePrefs((s) => s.offlineEntryEnabled);

  // Nothing to show when fully synced. With offline entry off, also hide the
  // transient "Syncing…" strip that every online save produces as it flushes
  // through the outbox — the user opted out of the offline experience, so we
  // don't surface sync chrome while online.
  if (online && (pending === 0 || !offlineEntryEnabled)) return null;

  const message = !online
    ? pending > 0
      ? t('offline.offlineWithPending', { count: pending })
      : offlineEntryEnabled
        ? t('offline.offline')
        : t('offline.offlineDisabled')
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
