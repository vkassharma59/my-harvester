import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AgentLedger, AgentListItem, PartyType } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { HarvesterScopeService } from '../../common/harvester-scope.service';
import { LinksService } from '../../common/links.service';
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
    private readonly hscope: HarvesterScopeService,
    private readonly links: LinksService,
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

  async findAll(user: AuthUser, harvesterId?: string): Promise<AgentListItem[]> {
    const tenantId = user.tenantId;
    const agents = await this.repo.find({
      where: { tenantId, ...(await this.hscope.where(user, harvesterId)) },
      order: { createdAt: 'DESC' },
    });
    if (!agents.length) return [];

    const ids = agents.map((a) => a.id);
    // Commission earned per agent (from jobs on active harvesters the user sees).
    const plots = await this.plots.find({
      where: { tenantId, agentId: In(ids), ...(await this.hscope.where(user)) },
      select: { agentId: true, commissionAmount: true },
    });
    const earned = new Map<string, number>();
    for (const p of plots) {
      if (p.agentId) earned.set(p.agentId, (earned.get(p.agentId) ?? 0) + (p.commissionAmount ?? 0));
    }
    // Commission paid per agent.
    const pays = await this.payments.find({
      where: { tenantId, partyType: PartyType.AGENT, partyId: In(ids) },
      select: { partyId: true, amount: true },
    });
    const paid = new Map<string, number>();
    for (const p of pays) paid.set(p.partyId, (paid.get(p.partyId) ?? 0) + p.amount);

    return agents.map((a) => {
      const totalCommission = earned.get(a.id) ?? 0;
      const amountPaid = paid.get(a.id) ?? 0;
      return { ...a, totalCommission, amountPaid, outstanding: totalCommission - amountPaid };
    }) as unknown as AgentListItem[];
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
      where: { tenantId: user.tenantId, agentId, ...(await this.hscope.where(user)) },
      order: { harvestDate: 'DESC' },
    });
    await this.links.attachPlotBhusa(plots);

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
