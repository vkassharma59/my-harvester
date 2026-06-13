import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { HarvesterStatus } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { adminsApi, harvestersApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { MoreStackParamList } from '@/navigation/types';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'AdminForm'>;

export function AdminFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const adminId = route.params?.adminId;
  const editing = !!adminId;
  const meId = useAuth((s) => s.admin?.id);
  const isSelf = editing && adminId === meId;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [harvesterIds, setHarvesterIds] = useState<string[]>([]);

  const { data: harvesters = [] } = useQuery({
    queryKey: ['harvesters', HarvesterStatus.ACTIVE],
    queryFn: () => harvestersApi.list(HarvesterStatus.ACTIVE),
  });

  const toggleHarvester = (id: string) =>
    setHarvesterIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const importFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('adminForm.permissionNeeded'), t('adminForm.permissionMessage'));
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const raw = contact.phoneNumbers?.[0]?.number ?? '';
      const digits = raw.replace(/[^0-9]/g, '');
      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
      setName(fullName || contact.name || name);
      setPhone(digits.length > 10 ? digits.slice(-10) : digits);
    } catch (e) {
      Alert.alert(t('adminForm.contacts'), apiErrorMessage(e, t('adminForm.contactsError')));
    }
  };

  const { data: existing } = useQuery({
    queryKey: ['admins', adminId],
    queryFn: () => adminsApi.get(adminId as string),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? t('adminForm.editTitle') : t('adminForm.addTitle') });
  }, [editing, navigation, t]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setEmail(existing.email);
      setPhone(existing.phone ?? '');
      setIsActive(existing.isActive);
      setHarvesterIds(existing.harvesterIds ?? []);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await adminsApi.update(adminId, { name, email, phone, isActive, harvesterIds });
        if (newPassword.trim()) await adminsApi.changePassword(adminId, newPassword);
      } else {
        await adminsApi.create({ name, email, password, phone, harvesterIds });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!name.trim()) return Alert.alert(t('adminForm.required'), t('adminForm.nameRequired'));
    if (!email.trim()) return Alert.alert(t('adminForm.required'), t('adminForm.emailRequired'));
    if (!/^[0-9]{10}$/.test(phone))
      return Alert.alert(t('adminForm.required'), t('adminForm.phoneRequired'));
    if (!editing && password.length < 8)
      return Alert.alert(t('adminForm.required'), t('adminForm.passwordRequired'));
    if (editing && newPassword.trim() && newPassword.length < 8)
      return Alert.alert(t('adminForm.required'), t('adminForm.newPasswordRequired'));
    save.mutate();
  };

  return (
    <Screen>
      {!editing ? (
        <Button
          title={t('adminForm.importContacts')}
          variant="secondary"
          onPress={importFromContacts}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}
      <TextField label={t('adminForm.nameLabel')} value={name} onChangeText={setName} />
      <TextField
        label={t('adminForm.emailLabel')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField
        label={t('adminForm.phoneLabel')}
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
        keyboardType="number-pad"
        placeholder={t('adminForm.phonePlaceholder')}
        maxLength={10}
      />

      {!editing ? (
        <TextField
          label={t('adminForm.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('adminForm.passwordPlaceholder')}
        />
      ) : (
        <>
          <TextField
            label={t('adminForm.newPasswordLabel')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder={t('adminForm.newPasswordPlaceholder')}
          />
          {!isSelf ? (
            <View style={styles.statusCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLabel}>{t('adminForm.accountAccess')}</Text>
                <Text style={[styles.statusValue, isActive ? styles.active : styles.inactive]}>
                  {isActive ? t('adminForm.active') : t('adminForm.inactive')}
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ true: colors.primaryLight, false: colors.border }}
                thumbColor={isActive ? colors.primary : colors.surface}
              />
            </View>
          ) : null}
        </>
      )}

      <Text style={styles.sectionLabel}>{t('adminForm.assignedHarvesters')}</Text>
      <Text style={styles.sectionHint}>
        {t('adminForm.assignedHarvestersHint')}
      </Text>
      <View style={styles.harvesterBox}>
        {harvesters.length === 0 ? (
          <Text style={styles.empty}>{t('adminForm.noActiveHarvesters')}</Text>
        ) : (
          harvesters.map((h) => {
            const on = harvesterIds.includes(h.id);
            return (
              <Pressable key={h.id} style={styles.harvesterRow} onPress={() => toggleHarvester(h.id)}>
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on ? <Text style={styles.checkboxTick}>✓</Text> : null}
                </View>
                <Text style={styles.harvesterName}>{h.name}</Text>
              </Pressable>
            );
          })
        )}
      </View>

      <Button
        title={editing ? t('adminForm.saveChanges') : t('adminForm.addTitle')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusLabel: { fontSize: font.size.sm, color: colors.textMuted, marginBottom: 2 },
  statusValue: { fontSize: font.size.md, fontWeight: font.weight.semibold },
  active: { color: colors.success },
  inactive: { color: colors.danger },
  sectionLabel: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    fontWeight: font.weight.medium,
    marginTop: spacing.sm,
  },
  sectionHint: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },
  harvesterBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  harvesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontSize: font.size.sm, fontWeight: font.weight.bold },
  harvesterName: { fontSize: font.size.md, color: colors.text },
  empty: { fontSize: font.size.sm, color: colors.textMuted, padding: spacing.md },
});

