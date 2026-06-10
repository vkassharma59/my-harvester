import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { customersApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState, Loading } from '@/components/States';
import { TextField } from '@/components/TextField';
import { CustomersStackParamList } from '@/navigation/types';
import { colors, font, spacing } from '@/theme';

type Props = NativeStackScreenProps<CustomersStackParamList, 'CustomersList'>;

export function CustomersScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ search: search.trim() || undefined, limit: 100 }),
  });

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <TextField
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Name, phone or village"
        />
      </View>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorState message={apiErrorMessage(error)} onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={<EmptyState title="No customers" subtitle="Add a customer to get started." />}
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('CustomerLedger', { customerId: item.id, name: item.name })}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.phone}</Text>
              {item.village ? <Text style={styles.sub}>{item.village}</Text> : null}
            </Card>
          )}
        />
      )}

      <View style={styles.footer}>
        <Button title="+ Add customer" onPress={() => navigation.navigate('CustomerForm')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  searchBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 },
  name: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  sub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
