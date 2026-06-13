import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, secureTextEntry, ...props }: TextFieldProps) {
  const isPassword = !!secureTextEntry;
  const [hidden, setHidden] = useState(true);

  // Password fields otherwise trigger the OS strong-password / autofill overlay,
  // which flickers in and out and bounces the cursor while typing. Opt out so
  // entry is smooth. (Callers can still override via props.)
  const passwordProps = isPassword
    ? ({
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        textContentType: 'none',
        autoComplete: 'off',
        importantForAutofill: 'no',
      } as const)
    : undefined;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          secureTextEntry={isPassword && hidden}
          {...passwordProps}
          {...props}
        />
        {isPassword ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.eye}>
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingRight: spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.size.md,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  eye: { paddingLeft: spacing.sm },
  error: { color: colors.danger, fontSize: font.size.xs, marginTop: spacing.xs },
});
