import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { apiErrorMessage } from '@/api/client';
import { expenseCategoriesApi } from '@/api/endpoints';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { MoreStackParamList } from '@/navigation/types';
import { spacing } from '@/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'ExpenseCategoryForm'>;

export function ExpenseCategoryFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const categoryId = route.params?.categoryId;
  const editing = !!categoryId;
  const [name, setName] = useState('');

  const { data: existing } = useQuery({
    queryKey: ['expense-category-one', categoryId],
    queryFn: () => expenseCategoriesApi.list().then((list) => list.find((c) => c.id === categoryId)),
    enabled: editing,
  });

  useEffect(() => {
    navigation.setOptions({
      title: editing ? t('expenseCategoryForm.editTitle') : t('expenseCategoryForm.addTitle'),
    });
  }, [editing, navigation, t]);

  useEffect(() => {
    if (existing) setName(existing.name);
  }, [existing]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim() };
      return editing
        ? expenseCategoriesApi.update(categoryId, body)
        : expenseCategoriesApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
      qc.invalidateQueries({ queryKey: ['expense-category-one', categoryId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t('common.error'), apiErrorMessage(e)),
  });

  const onSave = () => {
    if (!name.trim())
      return Alert.alert(t('expenseCategoryForm.required'), t('expenseCategoryForm.requiredName'));
    save.mutate();
  };

  return (
    <Screen>
      <TextField
        label={t('expenseCategoryForm.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('expenseCategoryForm.namePlaceholder')}
      />
      <Button
        title={editing ? t('expenseCategoryForm.saveChanges') : t('expenseCategoryForm.addTitle')}
        onPress={onSave}
        loading={save.isPending}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
