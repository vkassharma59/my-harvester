import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AgentLedger, PartyType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Payment, PaymentDocument } from '../payments/payment.schema';
import { Plot, PlotDocument } from '../plots/plot.schema';
import { Agent, AgentDocument } from './agent.schema';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(Agent.name) private readonly model: Model<AgentDocument>,
    @InjectModel(Plot.name) private readonly plots: Model<PlotDocument>,
    @InjectModel(Payment.name) private readonly payments: Model<PaymentDocument>,
  ) {}

  create(dto: CreateAgentDto, user: AuthUser): Promise<AgentDocument> {
    assertCanUseHarvester(user, dto.harvesterId);
    return this.model.create({
      ...dto,
      tenantId: new Types.ObjectId(user.tenantId),
      harvesterId: new Types.ObjectId(dto.harvesterId),
      createdBy: new Types.ObjectId(user.id),
      updatedBy: new Types.ObjectId(user.id),
    });
  }

  findAll(user: AuthUser, harvesterId?: string): Promise<AgentDocument[]> {
    const filter: FilterQuery<AgentDocument> = {
      tenantId: new Types.ObjectId(user.tenantId),
      ...harvesterFilter(user, harvesterId),
    };
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, user: AuthUser): Promise<AgentDocument> {
    const doc = await this.model
      .findOne({ _id: id, tenantId: new Types.ObjectId(user.tenantId), ...harvesterFilter(user) })
      .exec();
    if (!doc) throw new NotFoundException('Agent not found');
    return doc;
  }

  async update(id: string, dto: UpdateAgentDto, user: AuthUser): Promise<AgentDocument> {
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    const update: Record<string, unknown> = { ...dto, updatedBy: new Types.ObjectId(user.id) };
    if (dto.harvesterId) update.harvesterId = new Types.ObjectId(dto.harvesterId);
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, tenantId: new Types.ObjectId(user.tenantId), ...harvesterFilter(user) },
        update,
        { new: true, runValidators: true },
      )
      .exec();
    if (!doc) throw new NotFoundException('Agent not found');
    return doc;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const res = await this.model
      .findOneAndDelete({
        _id: id,
        tenantId: new Types.ObjectId(user.tenantId),
        ...harvesterFilter(user),
      })
      .exec();
    if (!res) throw new NotFoundException('Agent not found');
  }

  /** Commission earned (from jobs) vs paid (from payments) for one agent. */
  async ledger(agentId: string, user: AuthUser): Promise<AgentLedger> {
    const tenant = new Types.ObjectId(user.tenantId);
    const agent = await this.findOne(agentId, user);

    const plots = await this.plots
      .find({ tenantId: tenant, agentId: new Types.ObjectId(agentId), ...harvesterFilter(user) })
      .sort({ harvestDate: -1 })
      .exec();

    const payments = await this.payments
      .find({ tenantId: tenant, partyType: PartyType.AGENT, partyId: new Types.ObjectId(agentId) })
      .sort({ date: -1 })
      .exec();

    const totalCommission = plots.reduce((acc, p) => acc + (p.commissionAmount ?? 0), 0);
    const amountPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      agent: agent.toJSON() as unknown as AgentLedger['agent'],
      plots: plots.map((p) => p.toJSON()) as unknown as AgentLedger['plots'],
      totalCommission,
      amountPaid,
      outstanding: totalCommission - amountPaid,
      payments: payments.map((p) => p.toJSON()) as unknown as AgentLedger['payments'],
    };
  }
}
