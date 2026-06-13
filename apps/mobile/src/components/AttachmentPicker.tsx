import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { uploadsApi } from '@/api/endpoints';
import { isOnline } from '@/offline/connectivity';
import { Button } from '@/components/Button';
import { colors, font, spacing } from '@/theme';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface Props {
  /** The current attachment URL ('' = none). */
  value: string;
  onChange: (url: string) => void;
}

/**
 * Pick a file (bill / receipt / any document up to 5 MB), upload it, and expose
 * its URL via onChange. Used by the expense form and every "record payment"
 * sheet. Uploading needs connectivity; the surrounding entry can still be saved
 * offline without an attachment.
 */
export function AttachmentPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled) return;
    const asset = res.assets[0];
    if (asset.size != null && asset.size > MAX_FILE_BYTES) {
      Alert.alert(t('attachment.fileTooLargeTitle'), t('attachment.fileTooLarge'));
      return;
    }
    if (!isOnline()) {
      Alert.alert(t('attachment.offlineTitle'), t('attachment.offline'));
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadsApi.upload({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });
      setPicked({ url, name: asset.name });
      onChange(url);
    } catch (e) {
      Alert.alert(t('common.error'), apiErrorMessage(e, t('attachment.uploadFailed')));
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    setPicked(null);
    onChange('');
  };

  // Show the picked filename only if it still matches the current value.
  const displayName = picked && picked.url === value ? picked.name : t('attachment.saved');

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('attachment.label')}</Text>
      {value ? (
        <View style={styles.row}>
          <Pressable style={styles.info} onPress={() => void Linking.openURL(value).catch(() => {})}>
            <Text style={styles.icon}>📎</Text>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
          </Pressable>
          <Pressable onPress={remove} hitSlop={8}>
            <Text style={styles.remove}>{t('attachment.remove')}</Text>
          </Pressable>
        </View>
      ) : (
        <Button title={t('attachment.attach')} variant="secondary" onPress={pick} loading={uploading} />
      )}
      <Text style={styles.hint}>{t('attachment.hint')}</Text>
      {uploading ? <ActivityIndicator style={{ marginTop: spacing.xs }} color={colors.primary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, marginBottom: spacing.md },
  label: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  info: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.xs },
  icon: { fontSize: font.size.md },
  name: { flex: 1, fontSize: font.size.sm, color: colors.primary },
  remove: { fontSize: font.size.sm, color: colors.danger, fontWeight: font.weight.semibold },
  hint: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.xs },
});
