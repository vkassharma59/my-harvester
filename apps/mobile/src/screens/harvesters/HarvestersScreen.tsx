import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { HarvesterStatus } from '@wh/shared';
import { apiErrorMessage } from '@/api/client';
import { harvestersApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { MoreStackParamList } from '@/navigation/types';
import { colors, font, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'Harvesters'>;

export function HarvestersScreen({ navigation }: Props) {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['harvesters', 'all'],
    queryFn: () => harvestersApi.list(),
  });

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <FlatList
        data={data}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={<EmptyState title="No harvesters yet" subtitle="Add your first harvester." />}
        renderItem={({ item }) => {
          const active = item.status === HarvesterStatus.ACTIVE;
          const openEdit = () => navigation.navigate('HarvesterForm', { harvesterId: item.id });
          return (
            <Card onPress={openEdit}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.registrationNo ? <Text style={styles.sub}>{item.registrationNo}</Text> : null}
                  {item.model ? <Text style={styles.sub}>{item.model}</Text> : null}
                </View>
                <View style={styles.right}>
                  <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                      {active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <Pressable onPress={openEdit} hitSlop={10} style={styles.editBtn}>
                    <Text style={styles.editIcon}>✏️</Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          );
        }}
      />
      <View style={styles.footer}>
        <Button title="+ Add harvester" onPress={() => navigation.navigate('HarvesterForm')} />
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
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeActive: { backgroundColor: '#E6F4EA' },
  badgeInactive: { backgroundColor: '#FDECEA' },
  badgeText: { fontSize: font.size.xs, fontWeight: font.weight.semibold },
  badgeTextActive: { color: colors.success },
  badgeTextInactive: { color: colors.danger },
  editBtn: { padding: spacing.xs },
  editIcon: { fontSize: 18 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
