import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { HarvesterStatus } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { allowedHarvesterIds } from '../../common/scope';
import { Harvester, HarvesterDocument } from './harvester.schema';
import { CreateHarvesterDto, UpdateHarvesterDto } from './dto/harvester.dto';

@Injectable()
export class HarvestersService {
  constructor(
    @InjectModel(Harvester.name) private readonly model: Model<HarvesterDocument>,
  ) {}

  create(dto: CreateHarvesterDto, user: AuthUser): Promise<HarvesterDocument> {
    return this.model.create({
      ...dto,
      tenantId: new Types.ObjectId(user.tenantId),
      createdBy: new Types.ObjectId(user.id),
      updatedBy: new Types.ObjectId(user.id),
    });
  }

  findAll(user: AuthUser, status?: HarvesterStatus): Promise<HarvesterDocument[]> {
    const filter: FilterQuery<HarvesterDocument> = { tenantId: new Types.ObjectId(user.tenantId) };
    if (status) filter.status = status;
    // Staff admins only see the harvesters assigned to them.
    const allowed = allowedHarvesterIds(user);
    if (allowed) filter._id = { $in: allowed };
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, tenantId: string): Promise<HarvesterDocument> {
    const doc = await this.model
      .findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .exec();
    if (!doc) throw new NotFoundException('Harvester not found');
    return doc;
  }

  async update(id: string, dto: UpdateHarvesterDto, user: AuthUser): Promise<HarvesterDocument> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, tenantId: new Types.ObjectId(user.tenantId) },
        { ...dto, updatedBy: new Types.ObjectId(user.id) },
        { new: true, runValidators: true },
      )
      .exec();
    if (!doc) throw new NotFoundException('Harvester not found');
    return doc;
  }

  setStatus(id: string, status: HarvesterStatus, user: AuthUser): Promise<HarvesterDocument> {
    return this.update(id, { status }, user);
  }
}
