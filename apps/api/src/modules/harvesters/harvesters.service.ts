import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { HarvesterStatus } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { allowedHarvesterIds } from '../../common/scope';
import { Harvester } from './harvester.schema';
import { CreateHarvesterDto, UpdateHarvesterDto } from './dto/harvester.dto';

@Injectable()
export class HarvestersService {
  constructor(@InjectRepository(Harvester) private readonly repo: Repository<Harvester>) {}

  create(dto: CreateHarvesterDto, user: AuthUser): Promise<Harvester> {
    const harvester = this.repo.create({
      ...dto,
      tenantId: user.tenantId,
      createdBy: user.id,
      updatedBy: user.id,
    });
    return this.repo.save(harvester);
  }

  findAll(user: AuthUser, status?: HarvesterStatus): Promise<Harvester[]> {
    const where: FindOptionsWhere<Harvester> = { tenantId: user.tenantId };
    if (status) where.status = status;
    // Staff admins only see the harvesters assigned to them.
    const allowed = allowedHarvesterIds(user);
    if (allowed) where.id = In(allowed);
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Harvester> {
    const doc = await this.repo.findOne({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Harvester not found');
    return doc;
  }

  async update(id: string, dto: UpdateHarvesterDto, user: AuthUser): Promise<Harvester> {
    const doc = await this.findOne(id, user.tenantId);
    Object.assign(doc, dto);
    doc.updatedBy = user.id;
    return this.repo.save(doc);
  }

  setStatus(id: string, status: HarvesterStatus, user: AuthUser): Promise<Harvester> {
    return this.update(id, { status }, user);
  }
}
