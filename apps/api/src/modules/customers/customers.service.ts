import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { Paginated, PaginationDto } from '../../common/dto/pagination.dto';
import { Customer, CustomerDocument } from './customer.schema';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

/** Compare phones by digits only, so "98765 43210" == "9876543210". */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly model: Model<CustomerDocument>,
  ) {}

  /** Rejects a customer whose phone already exists in this tenant. */
  private async assertPhoneUnique(
    tenantId: Types.ObjectId,
    phone: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: FilterQuery<CustomerDocument> = { tenantId, phone };
    if (excludeId) filter._id = { $ne: excludeId };
    const existing = await this.model.findOne(filter).exec();
    if (existing) {
      throw new ConflictException(
        `A customer with this phone number already exists (${existing.name}).`,
      );
    }
  }

  async create(dto: CreateCustomerDto, user: AuthUser): Promise<CustomerDocument> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const phone = normalizePhone(dto.phone);
    await this.assertPhoneUnique(tenantId, phone);
    return this.model.create({
      ...dto,
      phone,
      tenantId,
      createdBy: new Types.ObjectId(user.id),
      updatedBy: new Types.ObjectId(user.id),
    });
  }

  async findAll(query: PaginationDto, tenantId: string): Promise<Paginated<CustomerDocument>> {
    const filter: FilterQuery<CustomerDocument> = { tenantId: new Types.ObjectId(tenantId) };
    if (query.search) {
      const rx = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: rx }, { phone: rx }, { village: rx }];
    }
    const { page, limit } = query;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<CustomerDocument> {
    const doc = await this.model
      .findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .exec();
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }

  async update(id: string, dto: UpdateCustomerDto, user: AuthUser): Promise<CustomerDocument> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const update: Record<string, unknown> = { ...dto, updatedBy: new Types.ObjectId(user.id) };
    if (dto.phone !== undefined) {
      const phone = normalizePhone(dto.phone);
      await this.assertPhoneUnique(tenantId, phone, id);
      update.phone = phone;
    }
    const doc = await this.model
      .findOneAndUpdate({ _id: id, tenantId }, update, { new: true, runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }
}
