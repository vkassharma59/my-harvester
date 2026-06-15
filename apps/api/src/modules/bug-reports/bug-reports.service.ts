import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BugStatus } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { BugReport } from './bug-report.schema';
import { CreateBugReportDto } from './dto/create-bug-report.dto';

@Injectable()
export class BugReportsService {
  constructor(@InjectRepository(BugReport) private readonly repo: Repository<BugReport>) {}

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
