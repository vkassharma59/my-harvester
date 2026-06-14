import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentLedger, PartyType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Payment } from '../payments/payment.schema';
import { Plot } from '../plots/plot.schema';
import { Agent } from './agent.schema';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent) private readonly repo: Repository<Agent>,
    @InjectRepository(Plot) private readonly plots: Repository<Plot>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
  ) {}

  create(dto: CreateAgentDto, user: AuthUser): Promise<Agent> {
    assertCanUseHarvester(user, dto.harvesterId);
    const { id, ...rest } = dto;
    return createMaybeWithId(
      this.repo,
      {
        ...rest,
        tenantId: user.tenantId,
        harvesterId: dto.harvesterId,
        createdBy: user.id,
        updatedBy: user.id,
      },
      id,
    );
  }

  findAll(user: AuthUser, harvesterId?: string): Promise<Agent[]> {
    return this.repo.find({
      where: { tenantId: user.tenantId, ...harvesterFilter(user, harvesterId) },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthUser): Promise<Agent> {
    const doc = await this.repo.findOne({
      where: { id, tenantId: user.tenantId, ...harvesterFilter(user) },
    });
    if (!doc) throw new NotFoundException('Agent not found');
    return doc;
  }

  async update(id: string, dto: UpdateAgentDto, user: AuthUser): Promise<Agent> {
    if (dto.harvesterId) assertCanUseHarvester(user, dto.harvesterId);
    const doc = await this.findOne(id, user);
    Object.assign(doc, dto);
    doc.updatedBy = user.id;
    return this.repo.save(doc);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const doc = await this.findOne(id, user);
    await this.repo.remove(doc);
  }

  /** Commission earned (from jobs) vs paid (from payments) for one agent. */
  async ledger(agentId: string, user: AuthUser): Promise<AgentLedger> {
    const agent = await this.findOne(agentId, user);

    const plots = await this.plots.find({
      where: { tenantId: user.tenantId, agentId, ...harvesterFilter(user) },
      order: { harvestDate: 'DESC' },
    });

    const payments = await this.payments.find({
      where: { tenantId: user.tenantId, partyType: PartyType.AGENT, partyId: agentId },
      order: { date: 'DESC' },
    });

    const totalCommission = plots.reduce((acc, p) => acc + (p.commissionAmount ?? 0), 0);
    const amountPaid = payments.reduce((acc, p) => acc + p.amount, 0);

    return {
      agent: agent as unknown as AgentLedger['agent'],
      plots: plots as unknown as AgentLedger['plots'],
      totalCommission,
      amountPaid,
      outstanding: totalCommission - amountPaid,
      payments: payments as unknown as AgentLedger['payments'],
    };
  }
}
