import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Role } from '@wh/shared';
import { Screen } from '@/components/Screen';
import { MoreStackParamList } from '@/navigation/types';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreMenu'>;

type MenuItem = { label: string; icon: string; route: keyof MoreStackParamList; superAdminOnly?: boolean };

const ITEMS: MenuItem[] = [
  { label: 'Harvesters', icon: '🚜', route: 'Harvesters' },
  { label: 'Labour', icon: '👷', route: 'Labour' },
  { label: 'Staff Admins', icon: '🧑‍💼', route: 'Admins', superAdminOnly: true },
  { label: 'Reports', icon: '📊', route: 'Reports' },
  { label: 'Settings', icon: '⚙️', route: 'Settings' },
];

export function MoreMenuScreen({ navigation }: Props) {
  const admin = useAuth((s) => s.admin);
  const logout = useAuth((s) => s.logout);
  const items = ITEMS.filter((i) => !i.superAdminOnly || admin?.role === Role.SUPER_ADMIN);

  const confirmLogout = () =>
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);

  return (
    <Screen>
      <View style={styles.profile}>
        <Text style={styles.name}>{admin?.name ?? 'Admin'}</Text>
        <Text style={styles.sub}>{admin?.email}</Text>
        {admin?.role ? <Text style={styles.role}>{admin.role.replace('_', ' ')}</Text> : null}
      </View>

      <View style={styles.menu}>
        {items.map((item) => (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            onPress={() => navigation.navigate(item.route as never)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={({ pressed }) => [styles.logout, pressed && styles.pressed]} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { marginBottom: spacing.xl },
  name: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  role: { fontSize: font.size.xs, color: colors.primary, marginTop: spacing.xs, fontWeight: font.weight.semibold },
  menu: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  item: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { opacity: 0.6 },
  icon: { fontSize: 20, marginRight: spacing.md },
  itemLabel: { flex: 1, fontSize: font.size.md, color: colors.text },
  chevron: { fontSize: 22, color: colors.textMuted },
  logout: { marginTop: spacing.xl, alignItems: 'center', padding: spacing.md },
  logoutText: { color: colors.danger, fontSize: font.size.md, fontWeight: font.weight.semibold },
});
