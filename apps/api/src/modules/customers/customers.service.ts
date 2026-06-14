import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { PartyType, Role } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { createMaybeWithId } from '../../common/idempotent';
import { harvesterFilter } from '../../common/scope';
import { Paginated, PaginationDto } from '../../common/dto/pagination.dto';
import { Payment } from '../payments/payment.schema';
import { Plot } from '../plots/plot.schema';
import { Customer } from './customer.schema';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

/** A customer plus their running bill / paid / outstanding totals. */
export type CustomerWithTotals = Record<string, unknown> & {
  id: string;
  totalBill: number;
  amountPaid: number;
  outstanding: number;
};

/** Compare phones by digits only, so "98765 43210" == "9876543210". */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Effective Bhusa buyers on a plot: the array if present, else the legacy single field. */
function effectiveBuyers(p: Plot): { customerId: string; amount: number }[] {
  if (p.bhusaBuyers && p.bhusaBuyers.length) return p.bhusaBuyers;
  if (p.bhusaBuyerId) return [{ customerId: p.bhusaBuyerId, amount: p.bhusaAmount ?? 0 }];
  return [];
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
    @InjectRepository(Plot) private readonly plots: Repository<Plot>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
  ) {}

  /** Rejects a customer whose phone already exists in this tenant. */
  private async assertPhoneUnique(tenantId: string, phone: string, excludeId?: string): Promise<void> {
    const existing = await this.repo.findOne({
      where: { tenantId, phone, ...(excludeId ? { id: Not(excludeId) } : {}) },
    });
    if (existing) {
      throw new ConflictException(`A customer with this phone number already exists (${existing.name}).`);
    }
  }

  async create(dto: CreateCustomerDto, user: AuthUser): Promise<Customer> {
    const phone = normalizePhone(dto.phone);
    await this.assertPhoneUnique(user.tenantId, phone);
    const { id, ...rest } = dto;
    return createMaybeWithId(
      this.repo,
      { ...rest, phone, tenantId: user.tenantId, createdBy: user.id, updatedBy: user.id },
      id,
    );
  }

  async findAll(query: PaginationDto, user: AuthUser): Promise<Paginated<CustomerWithTotals>> {
    const tenantId = user.tenantId;
    const hWhere = harvesterFilter(user);
    // Plots the user can see — used for both staff visibility and the bill totals.
    const scopedPlots = await this.plots.find({ where: { tenantId, ...hWhere } });

    const qb = this.repo.createQueryBuilder('c').where('c.tenantId = :tenantId', { tenantId });

    // Staff see customers linked to their jobs (owner or Bhusa buyer) OR ones
    // they added themselves (so a newly added customer is visible/selectable).
    if (user.role !== Role.OWNER) {
      const visible = new Set<string>();
      for (const p of scopedPlots) {
        visible.add(p.customerId);
        if (p.bhusaBuyerId) visible.add(p.bhusaBuyerId);
        for (const b of p.bhusaBuyers ?? []) visible.add(b.customerId);
      }
      const ids = [...visible];
      if (ids.length) qb.andWhere('(c.id IN (:...ids) OR c.createdBy = :uid)', { ids, uid: user.id });
      else qb.andWhere('c.createdBy = :uid', { uid: user.id });
    }

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(c.name LIKE :s OR c.phone LIKE :s OR c.village LIKE :s)', { s });
    }

    const { page, limit } = query;
    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [docs, total] = await qb.getManyAndCount();

    // Bill = harvesting charges on plots the customer OWNS + Bhusa charges on
    // plots where they are the Bhusa BUYER; amount paid is customer-level.
    const idSet = new Set(docs.map((d) => d.id));
    const harvestBill = new Map<string, number>();
    const bhusaBill = new Map<string, number>();
    for (const p of scopedPlots) {
      if (idSet.has(p.customerId)) {
        harvestBill.set(p.customerId, (harvestBill.get(p.customerId) ?? 0) + (p.harvestingAmount ?? 0));
      }
      for (const b of effectiveBuyers(p)) {
        if (idSet.has(b.customerId)) {
          bhusaBill.set(b.customerId, (bhusaBill.get(b.customerId) ?? 0) + (b.amount ?? 0));
        }
      }
    }

    const paid = new Map<string, number>();
    const ids = docs.map((d) => d.id);
    if (ids.length) {
      const pays = await this.payments.find({
        where: {
          tenantId,
          partyType: In([PartyType.CUSTOMER, PartyType.BHUSA_BUYER]),
          partyId: In(ids),
        },
      });
      for (const pay of pays) paid.set(pay.partyId, (paid.get(pay.partyId) ?? 0) + pay.amount);
    }

    const items: CustomerWithTotals[] = docs.map((d) => {
      const totalBill = (harvestBill.get(d.id) ?? 0) + (bhusaBill.get(d.id) ?? 0);
      const amountPaid = paid.get(d.id) ?? 0;
      return { ...d, id: d.id, totalBill, amountPaid, outstanding: totalBill - amountPaid };
    });

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<Customer> {
    const doc = await this.repo.findOne({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }

  async update(id: string, dto: UpdateCustomerDto, user: AuthUser): Promise<Customer> {
    const doc = await this.repo.findOne({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Customer not found');
    if (dto.phone !== undefined) {
      const phone = normalizePhone(dto.phone);
      await this.assertPhoneUnique(user.tenantId, phone, id);
      dto = { ...dto, phone };
    }
    Object.assign(doc, dto);
    doc.updatedBy = user.id;
    return this.repo.save(doc);
  }
}
