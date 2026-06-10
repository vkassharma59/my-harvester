import { Role } from '@wh/shared';
import { useAuth } from '@/store/auth';

/**
 * Harvester-access helpers for the current user.
 * - Super admins manage everything and always see the harvester picker.
 * - A staff admin only sees the picker / harvester dropdowns when they have
 *   more than one harvester; with exactly one, it's auto-selected and hidden.
 */
export function useHarvesterAccess() {
  const admin = useAuth((s) => s.admin);
  const isSuperAdmin = admin?.role === Role.SUPER_ADMIN;
  const harvesterIds = admin?.harvesterIds ?? [];

  const showPicker = isSuperAdmin || harvesterIds.length > 1;
  const soleHarvesterId =
    !isSuperAdmin && harvesterIds.length === 1 ? harvesterIds[0] : undefined;

  return { isSuperAdmin, harvesterIds, showPicker, soleHarvesterId };
}
