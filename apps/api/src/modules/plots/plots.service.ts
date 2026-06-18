import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { HarvesterType, HarvestType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { HarvesterScopeService } from '../../common/harvester-scope.service';
import { createMaybeWithId } from '../../common/idempotent';
import { LinksService } from '../../common/links.service';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Agent } from '../agents/agent.schema';
import { Harvester } from '../harvesters/harvester.schema';
import { Plot } from './plot.schema';
import { CreatePlotDto, UpdatePlotDto } from './dto/plot.dto';

interface BhusaBuyerInput {
  customerId: string;
  amount: number;
}

interface ComputeInput {
  area: number;
  ratePerBigha: number;
  harvestType: HarvestType;
  bhusaBuyers?: BhusaBuyerInput[];
}

@Injectable()
export class PlotsService {
  constructor(
    @InjectRepository(Plot) private readonly repo: Repository<Plot>,
    @InjectRepository(Harvester) private readonly harvesters: Repository<Harvester>,
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    private readonly hscope: HarvesterScopeService,
    private readonly links: LinksService,
  ) {}

  /** Resolves the commission for an optional agent on a job. The agent must
   *  belong to the same harvester. Returns null/0 when no agent is set. */
  private async resolveCommission(
    agentId: string | null | undefined,
    harvesterId: string,
    area: number,
    user: AuthUser,
  ): Promise<{ agentId: string | null; commissionAmount: number }> {
    if (!agentId) return { agentId: null, commissionAmount: 0 };
    const agent = await this.agents.findOne({ where: { id: agentId, tenantId: user.tenantId } });
    if (!agent) throw new BadRequestException('Agent not found');
    if (agent.harvesterId !== harvesterId) {
      throw new BadRequestException('Agent does not belong to this harvester');
    }
    return {
      agentId: agent.id,
      commissionAmount: Math.round(agent.commissionRate * area * 100) / 100,
    };
  }

  /** The applicable per-unit rate for a harvester + harvest type. */
  private rateFromHarvester(harvester: Harvester | null, harvestType: HarvestType): number {
    if (!harvester) return 0;
    if (harvester.type === HarvesterType.COMBINE) return harvester.ratePerUnit ?? 0;
    return harvestType === HarvestType.PER_BIGHA_WITH_BHUSA
      ? harvester.rateWithBhusa ?? 0
      : harvester.rateWithoutBhusa ?? 0;
  }

  /** The Bhusa buyers to apply from a DTO (new array, or legacy single field). */
  private bhusaBuyersFromDto(dto: {
    bhusaBuyers?: BhusaBuyerInput[];
    bhusaBuyerId?: string;
    bhusaAmount?: number;
  }): BhusaBuyerInput[] {
    if (dto.bhusaBuyers?.length) return dto.bhusaBuyers;
    if (dto.bhusaBuyerId) return [{ customerId: dto.bhusaBuyerId, amount: dto.bhusaAmount ?? 0 }];
    return [];
  }

  /** Derives harvestingAmount/totalAmount and the Bhusa buyers per harvest type. */
  private computeAmounts(input: ComputeInput) {
    const harvestingAmount = Math.round(input.area * input.ratePerBigha * 100) / 100;
    // Bhusa applies only to Type 2 (WITHOUT_BHUSA); ignore buyers otherwise.
    const raw = input.harvestType === HarvestType.WITHOUT_BHUSA ? input.bhusaBuyers ?? [] : [];
    const bhusaBuyers = raw
      .filter((b) => b.customerId)
      .map((b) => ({ customerId: b.customerId, amount: b.amount || 0 }));
    const bhusaAmount = Math.round(bhusaBuyers.reduce((acc, b) => acc + b.amount, 0) * 100) / 100;
    return {
      harvestingAmount,
      bhusaBuyers,
      bhusaAmount,
      totalAmount: Math.round((harvestingAmount + bhusaAmount) * 100) / 100,
    };
  }

  /** Populate the derived Bhusa response fields (kept for the mobile contract). */
  private hydrateBhusa(plot: Plot, buyers: BhusaBuyerInput[]): Plot {
    plot.bhusaBuyers = buyers;
    plot.bhusaAmount = Math.round(buyers.reduce((a, b) => a + b.amount, 0) * 100) / 100;
    plot.bhusaBuyerId = buyers.length === 1 ? buyers[0].customerId : null;
    return plot;
  }

  async create(dto: CreatePlotDto, user: AuthUser): Promise<Plot> {
    assertCanUseHarvester(user, dto.harvesterId);
    let ratePerBigha = dto.ratePerBigha;
    if (ratePerBigha == null) {
      const harvester = await this.harvesters.findOne({
        where: { id: dto.harvesterId, tenantId: user.tenantId },
      });
      ratePerBigha = this.rateFromHarvester(harvester, dto.harvestType);
    }
    const computed = this.computeAmounts({
      area: dto.area,
      ratePerBigha,
      harvestType: dto.harvestType,
      bhusaBuyers: this.bhusaBuyersFromDto(dto),
    });
    const commission = await this.resolveCommission(dto.agentId, dto.harvesterId, dto.area, user);

    // The Bhusa fields aren't columns anymore, so they're ignored by the insert.
    const { id, ...rest } = dto;
    const plot = await createMaybeWithId(
      this.repo,
      {
        ...rest,
        tenantId: user.tenantId,
        customerId: dto.customerId,
        harvesterId: dto.harvesterId,
        ratePerBigha,
        harvestingAmount: computed.harvestingAmount,
        totalAmount: computed.totalAmount,
        ...commission,
        createdBy: user.id,
        updatedBy: user.id,
      },
      id,
    );
    await this.links.setPlotBhusa(plot.id, computed.bhusaBuyers);
    return this.hydrateBhusa(plot, computed.bhusaBuyers);
  }

  async findAll(user: AuthUser, filter: { harvesterId?: string; customerId?: string }): Promise<Plot[]> {
    const where: FindOptionsWhere<Plot> = {
      tenantId: user.tenantId,
      ...(await this.hscope.where(user, filter.harvesterId)),
    };
    if (filter.customerId) where.customerId = filter.customerId;
    const plots = await this.repo.find({ where, order: { harvestDate: 'DESC' } });
    await this.links.attachPlotBhusa(plots);
    return plots;
  }

  async findOne(id: string, user: AuthUser): Promise<Plot> {
    const doc = await this.repo.findOne({
      where: { id, tenantId: user.tenantId, ...harvesterFilter(user) },
    });
    if (!doc) throw new NotFoundException('Plot not found');
    await this.links.attachPlotBhusa([doc]);
    return doc;
  }

  async update(id: string, dto: UpdatePlotDto, user: AuthUser): Promise<Plot> {
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    const existing = await this.findOne(id, user); // attaches existing.bhusaBuyers

    const harvestType = dto.harvestType ?? existing.harvestType;
    const area = dto.area ?? existing.area;
    const ratePerBigha = dto.ratePerBigha ?? existing.ratePerBigha;
    // Use the DTO's Bhusa buyers when provided, otherwise keep the existing ones.
    const bhusaProvided =
      dto.bhusaBuyers !== undefined || dto.bhusaBuyerId !== undefined || dto.bhusaAmount !== undefined;
    const bhusaBuyers = bhusaProvided ? this.bhusaBuyersFromDto(dto) : existing.bhusaBuyers ?? [];

    const computed = this.computeAmounts({ area, ratePerBigha, harvestType, bhusaBuyers });

    const harvesterId = dto.harvesterId ?? existing.harvesterId;
    const agentIdInput = dto.agentId !== undefined ? dto.agentId : existing.agentId ?? null;
    const commission = await this.resolveCommission(agentIdInput, harvesterId, area, user);

    // Bhusa fields on the dto set transient props only; save persists columns.
    Object.assign(existing, {
      ...dto,
      ...(dto.customerId ? { customerId: dto.customerId } : {}),
      ...(dto.harvesterId ? { harvesterId: dto.harvesterId } : {}),
      area,
      ratePerBigha,
      harvestType,
      harvestingAmount: computed.harvestingAmount,
      totalAmount: computed.totalAmount,
      ...commission,
      updatedBy: user.id,
    });
    const saved = await this.repo.save(existing);
    await this.links.setPlotBhusa(saved.id, computed.bhusaBuyers);
    return this.hydrateBhusa(saved, computed.bhusaBuyers);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const doc = await this.repo.findOne({
      where: { id, tenantId: user.tenantId, ...harvesterFilter(user) },
    });
    if (!doc) throw new NotFoundException('Plot not found');
    await this.links.setPlotBhusa(id, []); // clear the join rows first
    await this.repo.remove(doc);
  }
}
