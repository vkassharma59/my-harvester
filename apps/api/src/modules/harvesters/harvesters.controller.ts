import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { HarvesterStatus, Role } from '@wh/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { HarvestersService } from './harvesters.service';
import { CreateHarvesterDto, UpdateHarvesterDto } from './dto/harvester.dto';

@Controller('harvesters')
export class HarvestersController {
  constructor(private readonly harvesters: HarvestersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateHarvesterDto, @CurrentUser() user: AuthUser) {
    return this.harvesters.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('status') status?: HarvesterStatus) {
    return this.harvesters.findAll(user, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.harvesters.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateHarvesterDto, @CurrentUser() user: AuthUser) {
    return this.harvesters.update(id, dto, user);
  }

  @Patch(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  activate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.harvesters.setStatus(id, HarvesterStatus.ACTIVE, user);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.harvesters.setStatus(id, HarvesterStatus.INACTIVE, user);
  }
}
