import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BugReport as BugReportDto, BugStatus } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { BugReport } from './bug-report.schema';
import { CreateBugReportDto } from './dto/create-bug-report.dto';

@Injectable()
export class BugReportsService {
  constructor(@InjectRepository(BugReport) private readonly repo: Repository<BugReport>) {}

  /** The caller's own bug reports, newest first. */
  async listMine(user: AuthUser): Promise<BugReportDto[]> {
    const rows = await this.repo.find({
      where: { tenantId: user.tenantId, createdBy: user.id },
      order: { createdAt: 'DESC' },
    });
    return rows.map((b) => ({
      id: b.id,
      tenantId: b.tenantId,
      createdBy: b.createdBy ?? null,
      updatedBy: b.updatedBy ?? null,
      createdAt: new Date(b.createdAt).toISOString(),
      updatedAt: new Date(b.updatedAt).toISOString(),
      title: b.title,
      description: b.description,
      screenshotUrl: b.screenshotUrl ?? null,
      status: b.status,
    }));
  }

  /** File a bug from the app (scoped to the caller's tenant). */
  create(user: AuthUser, dto: CreateBugReportDto): Promise<BugReport> {
    return this.repo.save(
      this.repo.create({
        tenantId: user.tenantId,
        createdBy: user.id,
        updatedBy: user.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        screenshotUrl: dto.screenshotUrl?.trim() || null,
        status: BugStatus.OPEN,
      }),
    );
  }
}
