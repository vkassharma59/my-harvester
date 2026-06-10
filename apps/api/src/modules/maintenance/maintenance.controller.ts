import { Controller, Delete, UseGuards } from '@nestjs/common';
import { Role } from '@wh/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MaintenanceService } from './maintenance.service';

/** Destructive tenant operations — restricted to the owner (SUPER_ADMIN). */
@Controller('maintenance')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  /** Clear all business data for the caller's tenant (admins are kept). */
  @Delete('data')
  clearData(@CurrentUser() user: AuthUser) {
    return this.maintenance.clearTenantData(user.tenantId);
  }
}
