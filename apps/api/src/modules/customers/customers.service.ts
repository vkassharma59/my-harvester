import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { Paginated, PaginationDto } from '../../common/dto/pagination.dto';
import { Customer, CustomerDocument } from './customer.schema';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly model: Model<CustomerDocument>,
  ) {}

  create(dto: CreateCustomerDto, user: AuthUser): Promise<CustomerDocument> {
    return this.model.create({
      ...dto,
      tenantId: new Types.ObjectId(user.tenantId),
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
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, tenantId: new Types.ObjectId(user.tenantId) },
        { ...dto, updatedBy: new Types.ObjectId(user.id) },
        { new: true, runValidators: true },
      )
      .exec();
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }
}
