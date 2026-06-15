import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@wh/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OwnersQueryDto } from './dto/owners-query.dto';
import { SuperAdminService } from './super-admin.service';

/**
 * The platform-operator console API. Everything here is cross-tenant and
 * restricted to SUPER_ADMIN; the global JwtAuthGuard authenticates, RolesGuard
 * authorizes. Mounted at /api/v1/admin.
 */
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdmin: SuperAdminService) {}

  @Get('overview')
  overview() {
    return this.superAdmin.overview();
  }

  @Get('owners')
  owners(@Query() query: OwnersQueryDto) {
    return this.superAdmin.listOwners(query);
  }

  @Get('owners/:id')
  owner(@Param('id') id: string) {
    return this.superAdmin.ownerDetail(id);
  }
}
