import { useQuery } from '@tanstack/react-query';
import { HarvesterStatus, Role } from '@wh/shared';
import { harvestersApi } from '@/api/endpoints';
import { useAuth } from '@/store/auth';

/**
 * Harvester-access helpers for the current user.
 * - When exactly one harvester is available (a staff admin's single assignment,
 *   or a tenant — incl. the super admin — with only one active harvester), it's
 *   auto-selected and the picker / dropdowns are hidden.
 * - Otherwise the picker is shown so a harvester can be chosen.
 */
export function useHarvesterAccess() {
  const admin = useAuth((s) => s.admin);
  const isSuperAdmin = admin?.role === Role.OWNER;
  const harvesterIds = admin?.harvesterIds ?? [];

  // Active harvesters the current user can access (the API scopes by role).
  const { data: harvesters = [] } = useQuery({
    queryKey: ['harvesters', HarvesterStatus.ACTIVE],
    queryFn: () => harvestersApi.list(HarvesterStatus.ACTIVE),
  });

  // A staff admin's single assignment resolves immediately from the auth store;
  // otherwise fall back to "the only active harvester" (covers super admins).
  const staffSole = !isSuperAdmin && harvesterIds.length === 1 ? harvesterIds[0] : undefined;
  const soleHarvesterId = staffSole ?? (harvesters.length === 1 ? harvesters[0].id : undefined);
  const showPicker = !soleHarvesterId && (isSuperAdmin || harvesterIds.length > 1);

  return { isSuperAdmin, harvesterIds, showPicker, soleHarvesterId };
}
