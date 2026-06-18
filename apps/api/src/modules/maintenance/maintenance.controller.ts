import { Body, Controller, Delete, UseGuards } from '@nestjs/common';
import { Role } from '@wh/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ClearDataDto } from './dto/clear-data.dto';
import { MaintenanceService } from './maintenance.service';

/** Destructive tenant operations — restricted to the owner (OWNER). */
@Controller('maintenance')
@UseGuards(RolesGuard)
@Roles(Role.OWNER)
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  /** Clear all business data for the caller's tenant (admins are kept).
   *  Requires the owner to re-enter their password. */
  @Delete('data')
  clearData(@CurrentUser() user: AuthUser, @Body() dto: ClearDataDto) {
    return this.maintenance.clearTenantData(user, dto.password);
  }
}
