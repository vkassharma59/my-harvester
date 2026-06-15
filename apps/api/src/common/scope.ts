import { ForbiddenException } from '@nestjs/common';
import { In } from 'typeorm';
import { ALL_HARVESTERS, Role } from '@wh/shared';
import { AuthUser } from './decorators/current-user.decorator';

/**
 * Harvester-access rules:
 *  - OWNER sees every harvester in the tenant (optionally narrowed by a
 *    requested harvester from the dashboard dropdown).
 *  - A staff admin only sees the harvesters assigned to them.
 *
 * Returns a TypeORM where-fragment on `harvesterId` to merge with `{ tenantId }`.
 */
export function harvesterFilter(user: AuthUser, requested?: string): Record<string, unknown> {
  const wantsAll = !requested || requested === ALL_HARVESTERS;

  if (user.role === Role.OWNER) {
    return wantsAll ? {} : { harvesterId: requested };
  }

  // Staff admin — restricted to their assigned harvesters.
  const allowed = user.harvesterIds ?? [];
  if (!wantsAll) {
    // Asked for a harvester they don't own → match nothing.
    if (!allowed.includes(requested as string)) return { harvesterId: In([] as string[]) };
    return { harvesterId: requested };
  }
  return { harvesterId: In(allowed) };
}

/** The set of harvester ids a user may read, or `null` for "all in tenant" (owner). */
export function allowedHarvesterIds(user: AuthUser): string[] | null {
  if (user.role === Role.OWNER) return null;
  return user.harvesterIds ?? [];
}

/** Throws unless the user is allowed to write to the given harvester. */
export function assertCanUseHarvester(user: AuthUser, harvesterId: string): void {
  if (user.role === Role.OWNER) return;
  if (!(user.harvesterIds ?? []).includes(harvesterId)) {
    throw new ForbiddenException('You do not have access to this harvester');
  }
}
