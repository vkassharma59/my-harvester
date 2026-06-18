import { Body, Controller, Get, Post } from '@nestjs/common';
import { AllowExpired } from '../../common/decorators/allow-expired.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { BugReportsService } from './bug-reports.service';
import { CreateBugReportDto } from './dto/create-bug-report.dto';

@Controller('bug-reports')
export class BugReportsController {
  constructor(private readonly service: BugReportsService) {}

  /** The caller's own reported bugs (newest first) — allowed even when the
   *  subscription has lapsed. */
  @AllowExpired()
  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user);
  }

  /** Any authenticated user can report a bug — allowed even if their
   *  subscription has lapsed (so they can always reach us). */
  @AllowExpired()
  @Post()
  create(@Body() dto: CreateBugReportDto, @CurrentUser() user: AuthUser) {
    return this.service.create(user, dto);
  }
}
