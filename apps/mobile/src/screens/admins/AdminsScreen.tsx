import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Role } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { adminsApi, harvestersApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { MoreStackParamList } from '@/navigation/types';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'Admins'>;

export function AdminsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const meId = useAuth((s) => s.admin?.id);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['admins'],
    queryFn: () => adminsApi.list(),
  });
  const { data: harvesters = [] } = useQuery({
    queryKey: ['harvesters', 'all'],
    queryFn: () => harvestersApi.list(),
  });
  const nameById = new Map(harvesters.map((h) => [h.id, h.name]));
  const harvesterNames = (ids?: string[]) =>
    (ids ?? []).map((id) => nameById.get(id)).filter(Boolean).join(', ');

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <FlatList
        data={data}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={<EmptyState title={t('admins.emptyTitle')} subtitle={t('admins.emptySubtitle')} />}
        renderItem={({ item }) => {
          const isOwner = item.role === Role.SUPER_ADMIN;
          const assigned = harvesterNames(item.harvesterIds);
          return (
            <Card onPress={() => navigation.navigate('AdminForm', { adminId: item.id })}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.name}
                    {item.id === meId ? `  ${t('admins.youSuffix')}` : ''}
                  </Text>
                  <Text style={styles.sub}>{item.email}</Text>
                  {item.phone ? <Text style={styles.sub}>{item.phone}</Text> : null}
                  {isOwner ? (
                    <Text style={styles.harvesters}>{t('admins.adminOfAll')}</Text>
                  ) : assigned ? (
                    <Text style={styles.harvesters}>{t('admins.adminOf', { harvesters: assigned })}</Text>
                  ) : (
                    <Text style={styles.noHarvester}>{t('admins.noHarvesterAssigned')}</Text>
                  )}
                </View>
                <View style={styles.right}>
                  <View style={[styles.badge, isOwner ? styles.owner : styles.staff]}>
                    <Text style={[styles.badgeText, isOwner ? styles.ownerText : styles.staffText]}>
                      {isOwner ? t('admins.owner') : t('admins.admin')}
                    </Text>
                  </View>
                  {!item.isActive ? <Text style={styles.inactive}>{t('admins.inactive')}</Text> : null}
                </View>
              </View>
            </Card>
          );
        }}
      />
      <View style={styles.footer}>
        <Button title={t('admins.addAdmin')} onPress={() => navigation.navigate('AdminForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  harvesters: { fontSize: font.size.sm, color: colors.primary, marginTop: spacing.xs, fontWeight: font.weight.medium },
  noHarvester: { fontSize: font.size.sm, color: colors.warning, marginTop: spacing.xs },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  owner: { backgroundColor: '#E6F4EA' },
  staff: { backgroundColor: '#EEF1FB' },
  badgeText: { fontSize: font.size.xs, fontWeight: font.weight.semibold },
  ownerText: { color: colors.success },
  staffText: { color: '#3949AB' },
  inactive: { fontSize: font.size.xs, color: colors.danger },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
