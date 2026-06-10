import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { assertCanUseHarvester, harvesterFilter } from '../../common/scope';
import { Labour, LabourDocument } from './labour.schema';
import { CreateLabourDto, UpdateLabourDto } from './dto/labour.dto';

@Injectable()
export class LabourService {
  constructor(
    @InjectModel(Labour.name) private readonly model: Model<LabourDocument>,
  ) {}

  create(dto: CreateLabourDto, user: AuthUser): Promise<LabourDocument> {
    assertCanUseHarvester(user, dto.harvesterId);
    return this.model.create({
      ...dto,
      tenantId: new Types.ObjectId(user.tenantId),
      harvesterId: new Types.ObjectId(dto.harvesterId),
      createdBy: new Types.ObjectId(user.id),
      updatedBy: new Types.ObjectId(user.id),
    });
  }

  findAll(user: AuthUser, harvesterId?: string): Promise<LabourDocument[]> {
    const filter: FilterQuery<LabourDocument> = {
      tenantId: new Types.ObjectId(user.tenantId),
      ...harvesterFilter(user, harvesterId),
    };
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, user: AuthUser): Promise<LabourDocument> {
    const doc = await this.model
      .findOne({ _id: id, tenantId: new Types.ObjectId(user.tenantId), ...harvesterFilter(user) })
      .exec();
    if (!doc) throw new NotFoundException('Labour record not found');
    return doc;
  }

  async update(id: string, dto: UpdateLabourDto, user: AuthUser): Promise<LabourDocument> {
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
    if (!doc) throw new NotFoundException('Labour record not found');
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
    if (!res) throw new NotFoundException('Labour record not found');
  }
}
