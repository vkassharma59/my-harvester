import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BugStatus } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { bugReportsApi } from '@/api/endpoints';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { EmptyState, Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { isOnline } from '@/offline/connectivity';
import { colors, font, radius, spacing } from '@/theme';

export function ReportBugScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const { data: bugs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bug-reports'],
    queryFn: bugReportsApi.list,
  });

  const [formOpen, setFormOpen] = useState(false);
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
      qc.invalidateQueries({ queryKey: ['bug-reports'] });
      setFormOpen(false);
      Alert.alert(t('reportBug.sentTitle'), t('reportBug.sentBody'));
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const openForm = () => {
    setTitle('');
    setDescription('');
    setScreenshotUrl('');
    setFormOpen(true);
  };

  const onSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert(t('reportBug.requiredTitle'), t('reportBug.requiredBody'));
      return;
    }
    // Bug reports go straight to the server (not the offline outbox).
    if (!isOnline()) {
      Alert.alert(t('reportBug.offlineTitle'), t('reportBug.offlineBody'));
      return;
    }
    submit.mutate();
  };

  const statusBadge = (status: BugStatus) => {
    const resolved = status === BugStatus.RESOLVED;
    return (
      <View style={[styles.badge, resolved ? styles.badgeResolved : styles.badgeOpen]}>
        <Text style={[styles.badgeText, resolved ? styles.badgeTextResolved : styles.badgeTextOpen]}>
          {resolved ? t('reportBug.statusResolved') : t('reportBug.statusOpen')}
        </Text>
      </View>
    );
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      {/* Section 1 — raise a new bug */}
      <Button title={t('reportBug.newBug')} onPress={openForm} />

      {/* Section 2 — previously raised bugs (newest first) */}
      <Text style={styles.sectionTitle}>{t('reportBug.myBugsTitle')}</Text>
      {isLoading ? (
        <Loading />
      ) : bugs.length === 0 ? (
        <EmptyState title={t('reportBug.empty')} />
      ) : (
        bugs.map((b) => (
          <View key={b.id} style={styles.bugCard}>
            <View style={styles.bugTop}>
              <Text style={styles.bugTitle} numberOfLines={1}>
                {b.title}
              </Text>
              {statusBadge(b.status)}
            </View>
            {b.description ? (
              <Text style={styles.bugDesc} numberOfLines={2}>
                {b.description}
              </Text>
            ) : null}
            <Text style={styles.bugDate}>{new Date(b.createdAt).toLocaleDateString()}</Text>
          </View>
        ))
      )}

      {/* Create-bug form */}
      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior="padding">
          <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('reportBug.formTitle')}</Text>
              <Pressable onPress={() => setFormOpen(false)} hitSlop={8}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  bugCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bugTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  bugTitle: { flex: 1, fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  bugDesc: { fontSize: font.size.sm, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 19 },
  bugDate: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.sm },

  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeOpen: { backgroundColor: '#FDF0E1' },
  badgeResolved: { backgroundColor: '#E6F4EA' },
  badgeText: { fontSize: font.size.xs, fontWeight: font.weight.semibold },
  badgeTextOpen: { color: colors.warning },
  badgeTextResolved: { color: colors.success },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
  close: { fontSize: font.size.lg, color: colors.textMuted },
});
