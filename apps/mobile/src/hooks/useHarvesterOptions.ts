import { useQuery } from '@tanstack/react-query';
import { HarvesterStatus } from '@wh/shared';
import { harvestersApi } from '@/api/endpoints';
import { SelectOption } from '@/components/Select';

/** Active harvesters as Select options, for forms that must pick one. */
export function useHarvesterOptions() {
  const query = useQuery({
    queryKey: ['harvesters', HarvesterStatus.ACTIVE],
    queryFn: () => harvestersApi.list(HarvesterStatus.ACTIVE),
  });

  const options: SelectOption[] = (query.data ?? []).map((h) => ({ label: h.name, value: h.id }));
  return { ...query, options };
}
