import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaUnit } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AppSettings } from './settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(AppSettings) private readonly repo: Repository<AppSettings>) {}

  /** The tenant's settings row, created with defaults on first access. */
  async get(tenantId: string): Promise<AppSettings> {
    const existing = await this.repo.findOne({ where: { tenantId } });
    if (existing) return existing;
    const created = this.repo.create({
      tenantId,
      currency: 'INR',
      defaultAreaUnit: AreaUnit.BIGHA,
      firmName: '',
    });
    return this.repo.save(created);
  }

  async update(dto: UpdateSettingsDto, user: AuthUser): Promise<AppSettings> {
    const settings = await this.get(user.tenantId);
    Object.assign(settings, dto);
    settings.updatedBy = user.id;
    return this.repo.save(settings);
  }
}
