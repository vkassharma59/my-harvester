import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OwnerDetails } from './owner-details.schema';

/** Fields a caller may set on an owner's additional-details row. */
export interface OwnerDetailsPatch {
  state?: string | null;
  district?: string | null;
}

/** Read/write access to the per-owner additional-details table. */
@Injectable()
export class OwnerDetailsService {
  constructor(
    @InjectRepository(OwnerDetails) private readonly repo: Repository<OwnerDetails>,
  ) {}

  /** The details row for one owner, or null if none exists yet. */
  get(id: string): Promise<OwnerDetails | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Details rows for many owners, keyed by owner id (missing ids are absent). */
  async getMany(ids: string[]): Promise<Map<string, OwnerDetails>> {
    if (!ids.length) return new Map();
    const rows = await this.repo.find({ where: { id: In(ids) } });
    return new Map(rows.map((r) => [r.id, r]));
  }

  /** Owner counts grouped by state + district (skips rows without a state). */
  async distribution(): Promise<{ state: string; district: string | null; count: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('d')
      .select('d.state', 'state')
      .addSelect('d.district', 'district')
      .addSelect('COUNT(*)', 'count')
      .where('d.state IS NOT NULL')
      .groupBy('d.state')
      .addGroupBy('d.district')
      .getRawMany<{ state: string; district: string | null; count: string }>();
    return rows.map((r) => ({ state: r.state, district: r.district, count: Number(r.count) }));
  }

  /**
   * Create or update an owner's details row. Only the keys present in `patch`
   * are written, so partial edits never wipe other fields.
   */
  async upsert(id: string, patch: OwnerDetailsPatch): Promise<OwnerDetails> {
    const row = (await this.repo.findOne({ where: { id } })) ?? this.repo.create({ id });
    if (patch.state !== undefined) row.state = patch.state ?? null;
    if (patch.district !== undefined) row.district = patch.district ?? null;
    return this.repo.save(row);
  }
}
