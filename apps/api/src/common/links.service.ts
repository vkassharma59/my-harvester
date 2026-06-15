import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdminHarvester } from '../modules/admins/admin-harvester.schema';
import { Admin } from '../modules/admins/admin.schema';
import { FuelPumpHarvester } from '../modules/fuel-pumps/fuel-pump-harvester.schema';
import { FuelPump } from '../modules/fuel-pumps/fuel-pump.schema';
import { PlotBhusaBuyer } from '../modules/plots/plot-bhusa-buyer.schema';
import { Plot } from '../modules/plots/plot.schema';

interface BhusaBuyer {
  customerId: string;
  amount: number;
}

/**
 * Manages the normalized join tables (admin↔harvester, pump↔harvester, plot↔
 * bhusa-buyer) and hydrates the flat arrays back onto the entities so the API
 * response shape stays identical to the old JSON columns.
 */
@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(AdminHarvester) private readonly adminH: Repository<AdminHarvester>,
    @InjectRepository(FuelPumpHarvester) private readonly pumpH: Repository<FuelPumpHarvester>,
    @InjectRepository(PlotBhusaBuyer) private readonly plotB: Repository<PlotBhusaBuyer>,
  ) {}

  // ---------- Admin ↔ harvesters ----------

  async harvesterIdsForAdmin(adminId: string): Promise<string[]> {
    const rows = await this.adminH.find({ where: { adminId }, select: { harvesterId: true } });
    return rows.map((r) => r.harvesterId);
  }

  async attachAdminHarvesters(admins: Admin[]): Promise<void> {
    if (!admins.length) return;
    const rows = await this.adminH.find({ where: { adminId: In(admins.map((a) => a.id)) } });
    const byAdmin = new Map<string, string[]>();
    for (const r of rows) byAdmin.set(r.adminId, [...(byAdmin.get(r.adminId) ?? []), r.harvesterId]);
    for (const a of admins) a.harvesterIds = byAdmin.get(a.id) ?? [];
  }

  async setAdminHarvesters(adminId: string, harvesterIds: string[]): Promise<void> {
    await this.adminH.delete({ adminId });
    const unique = [...new Set(harvesterIds)];
    if (unique.length) await this.adminH.insert(unique.map((harvesterId) => ({ adminId, harvesterId })));
  }

  // ---------- Fuel pump ↔ harvesters ----------

  async attachPumpHarvesters(pumps: FuelPump[]): Promise<void> {
    if (!pumps.length) return;
    const rows = await this.pumpH.find({ where: { pumpId: In(pumps.map((p) => p.id)) } });
    const byPump = new Map<string, string[]>();
    for (const r of rows) byPump.set(r.pumpId, [...(byPump.get(r.pumpId) ?? []), r.harvesterId]);
    for (const p of pumps) p.harvesterIds = byPump.get(p.id) ?? [];
  }

  async setPumpHarvesters(pumpId: string, harvesterIds: string[]): Promise<void> {
    await this.pumpH.delete({ pumpId });
    const unique = [...new Set(harvesterIds)];
    if (unique.length) await this.pumpH.insert(unique.map((harvesterId) => ({ pumpId, harvesterId })));
  }

  /** Distinct pump ids that serve any of the given harvesters. */
  async pumpIdsForHarvesters(harvesterIds: string[]): Promise<string[]> {
    if (!harvesterIds.length) return [];
    const rows = await this.pumpH.find({
      where: { harvesterId: In(harvesterIds) },
      select: { pumpId: true },
    });
    return [...new Set(rows.map((r) => r.pumpId))];
  }

  // ---------- Plot ↔ bhusa buyers ----------

  async attachPlotBhusa(plots: Plot[]): Promise<void> {
    if (!plots.length) return;
    const rows = await this.plotB.find({ where: { plotId: In(plots.map((p) => p.id)) } });
    const byPlot = new Map<string, BhusaBuyer[]>();
    for (const r of rows) {
      byPlot.set(r.plotId, [...(byPlot.get(r.plotId) ?? []), { customerId: r.customerId, amount: r.amount }]);
    }
    for (const p of plots) {
      const buyers = byPlot.get(p.id) ?? [];
      p.bhusaBuyers = buyers;
      // Derived legacy fields kept for the mobile contract.
      p.bhusaAmount = Math.round(buyers.reduce((a, b) => a + b.amount, 0) * 100) / 100;
      p.bhusaBuyerId = buyers.length === 1 ? buyers[0].customerId : null;
    }
  }

  /** Bulk-clear join rows when their parents are deleted (used by maintenance). */
  async clearPlotBhusaForPlots(plotIds: string[]): Promise<void> {
    if (plotIds.length) await this.plotB.delete({ plotId: In(plotIds) });
  }

  async clearPumpHarvestersForPumps(pumpIds: string[]): Promise<void> {
    if (pumpIds.length) await this.pumpH.delete({ pumpId: In(pumpIds) });
  }

  async setPlotBhusa(plotId: string, buyers: BhusaBuyer[]): Promise<void> {
    await this.plotB.delete({ plotId });
    // Composite PK (plotId, customerId) forbids duplicates → merge amounts.
    const merged = new Map<string, number>();
    for (const b of buyers) {
      if (b.customerId) merged.set(b.customerId, (merged.get(b.customerId) ?? 0) + (b.amount || 0));
    }
    const rows = [...merged].map(([customerId, amount]) => ({ plotId, customerId, amount }));
    if (rows.length) await this.plotB.insert(rows);
  }
}
