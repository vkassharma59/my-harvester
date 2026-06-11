import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { HarvesterType, HarvestType } from '@wh/shared';
import { harvestersApi } from '@/api/endpoints';
import { tEnum } from '@/i18n';

/**
 * Returns a function that labels a job's harvest type. Combine harvesters have
 * no Bhusa distinction (the form forces a value), so they show a plain
 * "Per Bigha" instead of the misleading "Per Bigha (with Bhusa)".
 */
export function useHarvestTypeLabel() {
  const { t } = useTranslation();
  const { data: harvesters = [] } = useQuery({
    queryKey: ['harvesters', 'all'],
    queryFn: () => harvestersApi.list(),
  });
  const typeById = new Map(harvesters.map((h) => [h.id, h.type]));

  return (harvesterId: string, harvestType: HarvestType): string =>
    typeById.get(harvesterId) === HarvesterType.COMBINE
      ? t('harvests.perBigha')
      : tEnum('harvestType', harvestType);
}
