import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { customersApi, CustomerInput } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { CustomersStackParamList } from '@/navigation/types';
import { spacing } from '@/theme';

type Props = NativeStackScreenProps<CustomersStackParamList, 'CustomerForm'>;

export function CustomerFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const customerId = route.params?.customerId;
  const editing = !!customerId;
  const [form, setForm] = useState<CustomerInput>({ name: '', phone: '', village: '', address: '' });

  const { data: existing } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.get(customerId as string),
    enabled: editing,
  });

  useEffect(() => {
    if (editing) navigation.setOptions({ title: t('customerForm.editTitle') });
  }, [editing, navigation, t]);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        phone: existing.phone,
        village: existing.village ?? '',
        address: existing.address ?? '',
        deviceContactId: existing.deviceContactId,
      });
    }
  }, [existing]);

  const importFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('customerForm.permissionTitle'), t('customerForm.permissionBody'));
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const phone = contact.phoneNumbers?.[0]?.number ?? '';
      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
      setForm((f) => ({
        ...f,
        name: fullName || contact.name || f.name,
        phone: phone.replace(/\s+/g, ''),
        deviceContactId: contact.id,
      }));
    } catch (e) {
      Alert.alert(t('customerForm.contactsTitle'), apiErrorMessage(e, t('customerForm.contactsError')));
    }
  };

  const save = useMutation({
    mutationFn: () => (editing ? customersApi.update(customerId as string, form) : customersApi.create(form)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      if (editing) qc.invalidateQueries({ queryKey: ['customer-ledger', customerId] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert(t('customerForm.requiredTitle'), t('customerForm.requiredBody'));
      return;
    }
    save.mutate();
  };

  return (
    <Screen>
      <Button
        title={t('customerForm.importFromContacts')}
        variant="secondary"
        onPress={importFromContacts}
        style={{ marginBottom: spacing.lg }}
      />
      <TextField
        label={t('customerForm.nameLabel')}
        value={form.name}
        onChangeText={(name) => setForm((f) => ({ ...f, name }))}
      />
      <TextField
        label={t('customerForm.phoneLabel')}
        value={form.phone}
        onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
        keyboardType="phone-pad"
      />
      <TextField
        label={t('customerForm.villageLabel')}
        value={form.village}
        onChangeText={(village) => setForm((f) => ({ ...f, village }))}
      />
      <TextField
        label={t('customerForm.addressLabel')}
        value={form.address}
        onChangeText={(address) => setForm((f) => ({ ...f, address }))}
        multiline
      />
      <Button
        title={editing ? t('customerForm.saveChanges') : t('customerForm.addCustomer')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
