import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { bugReportsApi } from '@/api/endpoints';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { MoreStackParamList } from '@/navigation/types';
import { isOnline } from '@/offline/connectivity';
import { spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'ReportBug'>;

export function ReportBugScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      bugReportsApi.create({
        title: title.trim(),
        description: description.trim(),
        screenshotUrl: screenshotUrl || undefined,
      }),
    onSuccess: () => {
      Alert.alert(t('reportBug.sentTitle'), t('reportBug.sentBody'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert(t('reportBug.requiredTitle'), t('reportBug.requiredBody'));
      return;
    }
    // Bug reports go straight to the server (not the offline outbox), so they
    // need a connection — the screenshot upload does too.
    if (!isOnline()) {
      Alert.alert(t('reportBug.offlineTitle'), t('reportBug.offlineBody'));
      return;
    }
    submit.mutate();
  };

  return (
    <Screen>
      <TextField
        label={t('reportBug.titleLabel')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('reportBug.titlePlaceholder')}
        maxLength={160}
      />
      <TextField
        label={t('reportBug.descLabel')}
        value={description}
        onChangeText={setDescription}
        placeholder={t('reportBug.descPlaceholder')}
        multiline
        numberOfLines={5}
        style={{ minHeight: 120, textAlignVertical: 'top' }}
      />
      <AttachmentPicker value={screenshotUrl} onChange={setScreenshotUrl} />
      <Button
        title={t('reportBug.submit')}
        onPress={onSubmit}
        loading={submit.isPending}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}
