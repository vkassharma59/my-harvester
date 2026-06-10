import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** Consolidated summary for the tenant. `harvesterId=ALL` or omitted = all. */
  @Get('dashboard/summary')
  summary(@CurrentUser() user: AuthUser, @Query('harvesterId') harvesterId?: string) {
    return this.dashboard.summary(user.tenantId, harvesterId);
  }

  @Get('customers/:id/ledger')
  customerLedger(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.dashboard.customerLedger(id, user.tenantId);
  }
}
