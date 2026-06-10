import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { useState } from 'react';
import { Alert } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { customersApi, CustomerInput } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { CustomersStackParamList } from '@/navigation/types';
import { spacing } from '@/theme';

type Props = NativeStackScreenProps<CustomersStackParamList, 'CustomerForm'>;

export function CustomerFormScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CustomerInput>({ name: '', phone: '', village: '', address: '' });

  const importFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow contacts access to import a customer.');
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const phone = contact.phoneNumbers?.[0]?.number ?? '';
      setForm((f) => ({
        ...f,
        name: contact.name ?? f.name,
        phone: phone.replace(/\s+/g, ''),
        deviceContactId: contact.id,
      }));
    } catch (e) {
      Alert.alert('Contacts', apiErrorMessage(e, 'Could not open contacts.'));
    }
  };

  const save = useMutation({
    mutationFn: () => customersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert('Error', apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert('Required', 'Name and phone number are required.');
      return;
    }
    save.mutate();
  };

  return (
    <Screen>
      <Button
        title="📇 Import from contacts"
        variant="secondary"
        onPress={importFromContacts}
        style={{ marginBottom: spacing.lg }}
      />
      <TextField label="Name *" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} />
      <TextField
        label="Phone *"
        value={form.phone}
        onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
        keyboardType="phone-pad"
      />
      <TextField label="Village" value={form.village} onChangeText={(village) => setForm((f) => ({ ...f, village }))} />
      <TextField
        label="Address"
        value={form.address}
        onChangeText={(address) => setForm((f) => ({ ...f, address }))}
        multiline
      />
      <Button title="Add customer" onPress={onSave} loading={save.isPending} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}
