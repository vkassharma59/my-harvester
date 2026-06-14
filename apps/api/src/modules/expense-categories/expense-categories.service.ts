import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ExpenseCategory } from './expense-category.schema';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectRepository(ExpenseCategory) private readonly repo: Repository<ExpenseCategory>,
  ) {}

  /** All categories for the tenant (active + inactive) so clients can resolve
   *  the name of any historical expense. */
  findAll(user: AuthUser): Promise<ExpenseCategory[]> {
    return this.repo.find({ where: { tenantId: user.tenantId }, order: { name: 'ASC' } });
  }

  create(dto: CreateExpenseCategoryDto, user: AuthUser): Promise<ExpenseCategory> {
    const cat = this.repo.create({
      ...dto,
      tenantId: user.tenantId,
      createdBy: user.id,
      updatedBy: user.id,
    });
    return this.repo.save(cat);
  }

  async update(id: string, dto: UpdateExpenseCategoryDto, user: AuthUser): Promise<ExpenseCategory> {
    const doc = await this.repo.findOne({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Expense category not found');
    Object.assign(doc, dto);
    doc.updatedBy = user.id;
    return this.repo.save(doc);
  }

  /** Soft delete: deactivate so past expenses keep resolving their label. */
  async remove(id: string, user: AuthUser): Promise<void> {
    const res = await this.repo.update(
      { id, tenantId: user.tenantId },
      { isActive: false, updatedBy: user.id },
    );
    if (!res.affected) throw new NotFoundException('Expense category not found');
  }
}
