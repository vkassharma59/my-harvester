import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@wh/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ChangePasswordDto, UpdateAdminDto } from './dto/update-admin.dto';

/** Managing admins is restricted to the OWNER (the owner). */
@Controller('admins')
@UseGuards(RolesGuard)
@Roles(Role.OWNER)
export class AdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Post()
  create(@Body() dto: CreateAdminDto, @CurrentUser() user: AuthUser) {
    return this.admins.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.admins.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.admins.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminDto, @CurrentUser() user: AuthUser) {
    return this.admins.update(id, dto, user);
  }

  @Patch(':id/password')
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.admins.changePassword(id, dto, user);
    return { success: true };
  }
}
