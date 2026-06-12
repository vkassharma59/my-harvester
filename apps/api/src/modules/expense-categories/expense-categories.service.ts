import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from './expense-category.schema';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from './dto/expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectModel(ExpenseCategory.name)
    private readonly model: Model<ExpenseCategoryDocument>,
  ) {}

  /** All categories for the tenant (active + inactive) so clients can resolve
   *  the name of any historical expense. */
  findAll(user: AuthUser): Promise<ExpenseCategoryDocument[]> {
    return this.model
      .find({ tenantId: new Types.ObjectId(user.tenantId) })
      .sort({ name: 1 })
      .exec();
  }

  create(dto: CreateExpenseCategoryDto, user: AuthUser): Promise<ExpenseCategoryDocument> {
    return this.model.create({
      ...dto,
      tenantId: new Types.ObjectId(user.tenantId),
      createdBy: new Types.ObjectId(user.id),
      updatedBy: new Types.ObjectId(user.id),
    });
  }

  async update(
    id: string,
    dto: UpdateExpenseCategoryDto,
    user: AuthUser,
  ): Promise<ExpenseCategoryDocument> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, tenantId: new Types.ObjectId(user.tenantId) },
        { ...dto, updatedBy: new Types.ObjectId(user.id) },
        { new: true, runValidators: true },
      )
      .exec();
    if (!doc) throw new NotFoundException('Expense category not found');
    return doc;
  }

  /** Soft delete: deactivate so past expenses keep resolving their label. */
  async remove(id: string, user: AuthUser): Promise<void> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, tenantId: new Types.ObjectId(user.tenantId) },
        { isActive: false, updatedBy: new Types.ObjectId(user.id) },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException('Expense category not found');
  }
}
