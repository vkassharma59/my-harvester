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
import { colors, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'ChangePassword'>;

export function ChangePasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () =>
      Alert.alert(t('changePassword.doneTitle'), t('changePassword.doneBody'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]),
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const onSave = () => {
    setError(null);
    if (!current || !next || !confirm) {
      setError(t('changePassword.required'));
      return;
    }
    if (next.length < 6) {
      setError(t('changePassword.weak'));
      return;
    }
    if (next !== confirm) {
      setError(t('changePassword.mismatch'));
      return;
    }
    save.mutate();
  };

  return (
    <Screen>
      <TextField
        label={t('changePassword.currentLabel')}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        placeholder="••••••••"
      />
      <TextField
        label={t('changePassword.newLabel')}
        value={next}
        onChangeText={setNext}
        secureTextEntry
        placeholder="••••••••"
      />
      <TextField
        label={t('changePassword.confirmLabel')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="••••••••"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={t('changePassword.submit')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginVertical: spacing.sm },
});
