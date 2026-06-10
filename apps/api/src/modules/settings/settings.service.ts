import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AppSettings, AppSettingsDocument } from './settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(AppSettings.name) private readonly model: Model<AppSettingsDocument>,
  ) {}

  /** The tenant's settings doc, created with defaults on first access. */
  async get(tenantId: string): Promise<AppSettingsDocument> {
    const oid = new Types.ObjectId(tenantId);
    const existing = await this.model.findOne({ tenantId: oid }).exec();
    if (existing) return existing;
    return this.model.create({ tenantId: oid });
  }

  async update(dto: UpdateSettingsDto, user: AuthUser): Promise<AppSettingsDocument> {
    return this.model
      .findOneAndUpdate(
        { tenantId: new Types.ObjectId(user.tenantId) },
        { ...dto, updatedBy: new Types.ObjectId(user.id) },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      )
      .exec();
  }
}
