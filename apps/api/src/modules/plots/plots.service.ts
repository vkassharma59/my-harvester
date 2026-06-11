import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { HarvesterType, HarvestType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Agent, AgentDocument } from '../agents/agent.schema';
import { Harvester, HarvesterDocument } from '../harvesters/harvester.schema';
import { Plot, PlotDocument } from './plot.schema';
import { CreatePlotDto, UpdatePlotDto } from './dto/plot.dto';

interface ComputeInput {
  area: number;
  ratePerBigha: number;
  harvestType: HarvestType;
  bhusaBuyerId?: string | null;
  bhusaAmount?: number;
}

@Injectable()
export class PlotsService {
  constructor(
    @InjectModel(Plot.name) private readonly model: Model<PlotDocument>,
    @InjectModel(Harvester.name) private readonly harvesters: Model<HarvesterDocument>,
    @InjectModel(Agent.name) private readonly agents: Model<AgentDocument>,
  ) {}

  /** Resolves the commission for an optional agent on a job. The agent must
   *  belong to the same harvester. Returns null/0 when no agent is set. */
  private async resolveCommission(
    agentId: string | null | undefined,
    harvesterId: string,
    area: number,
    user: AuthUser,
  ): Promise<{ agentId: Types.ObjectId | null; commissionAmount: number }> {
    if (!agentId) return { agentId: null, commissionAmount: 0 };
    const agent = await this.agents
      .findOne({ _id: new Types.ObjectId(agentId), tenantId: new Types.ObjectId(user.tenantId) })
      .exec();
    if (!agent) throw new BadRequestException('Agent not found');
    if (agent.harvesterId.toString() !== harvesterId.toString()) {
      throw new BadRequestException('Agent does not belong to this harvester');
    }
    return {
      agentId: agent._id as Types.ObjectId,
      commissionAmount: Math.round(agent.commissionRate * area * 100) / 100,
    };
  }

  /** The applicable per-unit rate for a harvester + harvest type. */
  private rateFromHarvester(
    harvester: HarvesterDocument | null,
    harvestType: HarvestType,
  ): number {
    if (!harvester) return 0;
    if (harvester.type === HarvesterType.COMBINE) return harvester.ratePerUnit ?? 0;
    return harvestType === HarvestType.PER_BIGHA_WITH_BHUSA
      ? harvester.rateWithBhusa ?? 0
      : harvester.rateWithoutBhusa ?? 0;
  }

  /** Derives harvestingAmount/totalAmount and validates the Bhusa rules per type. */
  private computeAmounts(input: ComputeInput) {
    const harvestingAmount = Math.round(input.area * input.ratePerBigha * 100) / 100;

    let bhusaAmount = 0;
    let bhusaBuyerId: Types.ObjectId | null = null;

    if (input.harvestType === HarvestType.WITHOUT_BHUSA) {
      bhusaAmount = input.bhusaAmount ?? 0;
      bhusaBuyerId = input.bhusaBuyerId ? new Types.ObjectId(input.bhusaBuyerId) : null;
    } else if (input.bhusaBuyerId || input.bhusaAmount) {
      throw new BadRequestException(
        'Bhusa buyer/amount is only valid for the WITHOUT_BHUSA harvest type',
      );
    }

    return {
      harvestingAmount,
      bhusaBuyerId,
      bhusaAmount,
      totalAmount: Math.round((harvestingAmount + bhusaAmount) * 100) / 100,
    };
  }

  async create(dto: CreatePlotDto, user: AuthUser): Promise<PlotDocument> {
    assertCanUseHarvester(user, dto.harvesterId);
    let ratePerBigha = dto.ratePerBigha;
    if (ratePerBigha == null) {
      const harvester = await this.harvesters
        .findOne({
          _id: new Types.ObjectId(dto.harvesterId),
          tenantId: new Types.ObjectId(user.tenantId),
        })
        .exec();
      ratePerBigha = this.rateFromHarvester(harvester, dto.harvestType);
    }
    const computed = this.computeAmounts({
      area: dto.area,
      ratePerBigha,
      harvestType: dto.harvestType,
      bhusaBuyerId: dto.bhusaBuyerId,
      bhusaAmount: dto.bhusaAmount,
    });
    const commission = await this.resolveCommission(dto.agentId, dto.harvesterId, dto.area, user);

    return this.model.create({
      ...dto,
      tenantId: new Types.ObjectId(user.tenantId),
      customerId: new Types.ObjectId(dto.customerId),
      harvesterId: new Types.ObjectId(dto.harvesterId),
      ratePerBigha,
      ...computed,
      ...commission,
      createdBy: new Types.ObjectId(user.id),
      updatedBy: new Types.ObjectId(user.id),
    });
  }

  findAll(
    user: AuthUser,
    filter: { harvesterId?: string; customerId?: string },
  ): Promise<PlotDocument[]> {
    const q: FilterQuery<PlotDocument> = {
      tenantId: new Types.ObjectId(user.tenantId),
      ...harvesterFilter(user, filter.harvesterId),
    };
    if (filter.customerId) q.customerId = new Types.ObjectId(filter.customerId);
    return this.model.find(q).sort({ harvestDate: -1 }).exec();
  }

  async findOne(id: string, user: AuthUser): Promise<PlotDocument> {
    const doc = await this.model
      .findOne({ _id: id, tenantId: new Types.ObjectId(user.tenantId), ...harvesterFilter(user) })
      .exec();
    if (!doc) throw new NotFoundException('Plot not found');
    return doc;
  }

  async update(id: string, dto: UpdatePlotDto, user: AuthUser): Promise<PlotDocument> {
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    const existing = await this.findOne(id, user);

    const harvestType = dto.harvestType ?? existing.harvestType;
    const area = dto.area ?? existing.area;
    const ratePerBigha = dto.ratePerBigha ?? existing.ratePerBigha;
    const bhusaBuyerId =
      dto.bhusaBuyerId !== undefined
        ? dto.bhusaBuyerId
        : existing.bhusaBuyerId?.toString() ?? null;
    const bhusaAmount = dto.bhusaAmount ?? existing.bhusaAmount;

    const computed = this.computeAmounts({
      area,
      ratePerBigha,
      harvestType,
      bhusaBuyerId,
      bhusaAmount,
    });

    const harvesterId = dto.harvesterId ?? existing.harvesterId.toString();
    const agentIdInput =
      dto.agentId !== undefined ? dto.agentId : existing.agentId?.toString() ?? null;
    const commission = await this.resolveCommission(agentIdInput, harvesterId, area, user);

    Object.assign(existing, {
      ...dto,
      ...(dto.customerId ? { customerId: new Types.ObjectId(dto.customerId) } : {}),
      ...(dto.harvesterId ? { harvesterId: new Types.ObjectId(dto.harvesterId) } : {}),
      area,
      ratePerBigha,
      harvestType,
      ...computed,
      ...commission,
      updatedBy: new Types.ObjectId(user.id),
    });

    return existing.save();
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const res = await this.model
      .findOneAndDelete({
        _id: id,
        tenantId: new Types.ObjectId(user.tenantId),
        ...harvesterFilter(user),
      })
      .exec();
    if (!res) throw new NotFoundException('Plot not found');
  }
}
