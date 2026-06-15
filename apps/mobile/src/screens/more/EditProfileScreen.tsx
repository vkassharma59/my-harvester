import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { MoreStackParamList } from '@/navigation/types';
import { useAuth } from '@/store/auth';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const admin = useAuth((s) => s.admin);
  const setAdmin = useAuth((s) => s.setAdmin);

  const [name, setName] = useState(admin?.name ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const changingPassword = !!(current || next || confirm);

  const save = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        name: name.trim(),
        ...(changingPassword ? { currentPassword: current, newPassword: next } : {}),
      }),
    onSuccess: (updated) => {
      setAdmin(updated);
      Alert.alert(t('editProfile.doneTitle'), t('editProfile.doneBody'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const onSave = () => {
    setError(null);
    if (!name.trim()) {
      setError(t('editProfile.nameRequired'));
      return;
    }
    if (changingPassword) {
      if (!current || !next || !confirm) {
        setError(t('editProfile.pwRequired'));
        return;
      }
      if (next.length < 6) {
        setError(t('editProfile.weak'));
        return;
      }
      if (next !== confirm) {
        setError(t('editProfile.mismatch'));
        return;
      }
    }
    save.mutate();
  };

  return (
    <Screen>
      <TextField label={t('editProfile.nameLabel')} value={name} onChangeText={setName} />
      <TextField
        label={t('editProfile.emailLabel')}
        value={admin?.email ?? ''}
        editable={false}
        style={styles.disabled}
      />
      <TextField
        label={t('editProfile.phoneLabel')}
        value={admin?.phone ?? ''}
        editable={false}
        placeholder="—"
        style={styles.disabled}
      />

      <Text style={styles.section}>{t('editProfile.changePasswordSection')}</Text>
      <Text style={styles.hint}>{t('editProfile.changePasswordHint')}</Text>
      <TextField
        label={t('editProfile.currentLabel')}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        placeholder="••••••••"
      />
      <TextField
        label={t('editProfile.newLabel')}
        value={next}
        onChangeText={setNext}
        secureTextEntry
        placeholder="••••••••"
      />
      <TextField
        label={t('editProfile.confirmLabel')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="••••••••"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={t('editProfile.save')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  disabled: { color: colors.textMuted },
  section: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  hint: { fontSize: font.size.xs, color: colors.textMuted, marginBottom: spacing.sm },
  error: { color: colors.danger, marginVertical: spacing.sm },
});
