import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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

  const { data: existing } = useQuery({
    queryKey: ['admins', adminId],
    queryFn: () => adminsApi.get(adminId as string),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Edit admin' : 'Add admin' });
  }, [editing, navigation]);

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
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!name.trim()) return Alert.alert('Required', 'Name is required.');
    if (!email.trim()) return Alert.alert('Required', 'Email is required.');
    if (!/^[0-9]{10}$/.test(phone))
      return Alert.alert('Required', 'Enter a valid 10-digit mobile number.');
    if (!editing && password.length < 8)
      return Alert.alert('Required', 'Password must be at least 8 characters.');
    if (editing && newPassword.trim() && newPassword.length < 8)
      return Alert.alert('Required', 'New password must be at least 8 characters.');
    save.mutate();
  };

  return (
    <Screen>
      <TextField label="Name *" value={name} onChangeText={setName} />
      <TextField
        label="Email *"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField
        label="Mobile number *"
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
        keyboardType="number-pad"
        placeholder="10-digit mobile"
        maxLength={10}
      />

      {!editing ? (
        <TextField
          label="Password *"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 8 characters"
        />
      ) : (
        <>
          <TextField
            label="Set new password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Leave blank to keep current"
          />
          {!isSelf ? (
            <View style={styles.statusCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLabel}>Account access</Text>
                <Text style={[styles.statusValue, isActive ? styles.active : styles.inactive]}>
                  {isActive ? 'Active' : 'Inactive'}
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

      <Text style={styles.sectionLabel}>Assigned harvesters</Text>
      <Text style={styles.sectionHint}>
        This admin can only see and manage data for the harvesters you select.
      </Text>
      <View style={styles.harvesterBox}>
        {harvesters.length === 0 ? (
          <Text style={styles.empty}>No active harvesters to assign.</Text>
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
        title={editing ? 'Save changes' : 'Add admin'}
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

