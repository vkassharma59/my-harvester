import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@wh/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { OwnersQueryDto } from './dto/owners-query.dto';
import { ChangePlanDto, ExtendTrialDto, RecordPaymentDto, ResetPasswordDto } from './dto/subscription.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
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

  @Get('flags')
  flags() {
    return this.superAdmin.flags();
  }

  @Get('owners')
  owners(@Query() query: OwnersQueryDto) {
    return this.superAdmin.listOwners(query);
  }

  @Get('owners/:id')
  owner(@Param('id') id: string) {
    return this.superAdmin.ownerDetail(id);
  }

  @Post('owners')
  onboard(@Body() dto: CreateOwnerDto) {
    return this.superAdmin.onboardOwner(dto);
  }

  @Patch('owners/:id')
  update(@Param('id') id: string, @Body() dto: UpdateOwnerDto) {
    return this.superAdmin.updateOwner(id, dto);
  }

  @Post('owners/:id/extend-trial')
  extendTrial(@Param('id') id: string, @Body() dto: ExtendTrialDto) {
    return this.superAdmin.extendTrial(id, dto.days);
  }

  @Post('owners/:id/payments')
  recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto, @CurrentUser() user: AuthUser) {
    return this.superAdmin.recordPayment(id, dto, user.id);
  }

  @Patch('owners/:id/plan')
  changePlan(@Param('id') id: string, @Body() dto: ChangePlanDto) {
    return this.superAdmin.changePlan(id, dto);
  }

  @Post('owners/:id/suspend')
  suspend(@Param('id') id: string) {
    return this.superAdmin.suspend(id);
  }

  @Post('owners/:id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.superAdmin.reactivate(id);
  }

  @Post('owners/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.superAdmin.resetOwnerPassword(id, dto.password);
  }
}
