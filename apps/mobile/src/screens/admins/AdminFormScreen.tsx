import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { adminsApi } from '@/api/endpoints';
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
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await adminsApi.update(adminId, { name, email, phone, isActive });
        if (newPassword.trim()) await adminsApi.changePassword(adminId, newPassword);
      } else {
        await adminsApi.create({ name, email, password, phone });
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
});
