import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { customersApi, CustomerInput } from '@/api/endpoints';
import { offlineCreate, offlineUpdate } from '@/offline/enqueue';
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
    mutationFn: () => {
      if (editing) offlineUpdate('customer', customerId as string, form);
      else offlineCreate('customer', form);
      return Promise.resolve();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      if (editing) qc.invalidateQueries({ queryKey: ['customer-ledger', customerId] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert(t('customerForm.requiredTitle'), t('customerForm.requiredBody'));
      return;
    }
    // Pre-check for a customer with the same phone so the user gets immediate
    // feedback. (Creates go through the offline outbox, where the server's
    // duplicate 409 is treated as an idempotent replay and never surfaced.)
    // Best-effort: if the lookup fails (offline), fall through and let it save.
    const phone = form.phone.replace(/\D/g, '');
    try {
      const res = await customersApi.list({ search: phone, limit: 100 });
      const dup = res.items.find((c) => c.phone.replace(/\D/g, '') === phone && c.id !== customerId);
      if (dup) {
        Alert.alert(t('customerForm.duplicateTitle'), t('customerForm.duplicateBody', { name: dup.name }));
        return;
      }
    } catch {
      // Offline / lookup failed — proceed; the outbox will sync the create.
    }
    save.mutate();
  };

  return (
    <Screen>
      {!editing ? (
        <Button
          title={t('customerForm.importFromContacts')}
          variant="secondary"
          onPress={importFromContacts}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}
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
