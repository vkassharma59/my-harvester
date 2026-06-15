import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { flushOutbox } from '@/offline/sync';
import { useSubscriptionBlock } from '@/offline/subscription';
import { colors, font, spacing } from '@/theme';

/**
 * Shown when the API has blocked writes because the subscription has expired or
 * been suspended (HTTP 402). The app stays usable for reading; this strip tells
 * the owner why saving is blocked and lets them retry once they've renewed
 * (re-attempts the queued changes).
 */
export function SubscriptionBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const blocked = useSubscriptionBlock((s) => s.blocked);
  const code = useSubscriptionBlock((s) => s.code);

  if (!blocked) return null;

  const message = code === 'SUBSCRIPTION_SUSPENDED' ? t('subscription.suspended') : t('subscription.expired');

  return (
    <View style={[styles.bar, { paddingBottom: spacing.xs + insets.bottom }]}>
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={() => void flushOutbox()} hitSlop={8}>
        <Text style={styles.retry}>{t('subscription.retry')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  text: { flex: 1, color: colors.white, fontSize: font.size.xs, fontWeight: font.weight.semibold },
  retry: {
    color: colors.white,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    textDecorationLine: 'underline',
  },
});
