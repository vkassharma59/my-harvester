import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ALL_HARVESTERS, HarvesterStatus } from '@wh/shared';
import { AuthUser } from './decorators/current-user.decorator';
import { allowedHarvesterIds } from './scope';
import { Harvester } from '../modules/harvesters/harvester.schema';

/**
 * Resolves the set of harvesters whose data should be counted/shown: those the
 * user may access (owner = all, staff = assigned) AND that are currently ACTIVE.
 * Deactivating a harvester therefore hides all its jobs/expenses/workers/agents
 * from every list, total, ledger and dashboard — without deleting anything, so
 * reactivating restores it.
 */
@Injectable()
export class HarvesterScopeService {
  constructor(@InjectRepository(Harvester) private readonly harvesters: Repository<Harvester>) {}

  /** Active harvester ids in the tenant the user may access (optionally narrowed to one). */
  async activeIds(user: AuthUser, requested?: string): Promise<string[]> {
    const rows = await this.harvesters.find({
      where: { tenantId: user.tenantId, status: HarvesterStatus.ACTIVE },
      select: { id: true },
    });
    let ids = rows.map((r) => r.id);
    const allowed = allowedHarvesterIds(user); // null = all (owner)
    if (allowed) ids = ids.filter((id) => allowed.includes(id));
    if (requested && requested !== ALL_HARVESTERS) ids = ids.filter((id) => id === requested);
    return ids;
  }

  /**
   * A TypeORM where-fragment restricting `harvesterId` to active + allowed
   * harvesters — a drop-in (async) replacement for `harvesterFilter` on the
   * read/calculation paths. `In([])` correctly matches nothing when there are
   * no active harvesters.
   */
  async where(user: AuthUser, requested?: string): Promise<Record<string, unknown>> {
    return { harvesterId: In(await this.activeIds(user, requested)) };
  }
}
