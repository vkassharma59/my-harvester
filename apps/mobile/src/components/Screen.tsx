import { ReactNode } from 'react';
import { RefreshControl, StyleSheet, View, ViewStyle } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
}

/** Standard screen wrapper: safe-area aware, optional scroll + pull-to-refresh. */
export function Screen({
  children,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const contentStyle = [padded && styles.padded, style];

  if (!scroll) {
    // Non-scrolling screens still avoid the keyboard so inputs stay visible.
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <View style={[styles.fill, { paddingBottom: insets.bottom }, ...contentStyle]}>{children}</View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }, ...contentStyle]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={spacing.xl}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { padding: spacing.lg },
});
