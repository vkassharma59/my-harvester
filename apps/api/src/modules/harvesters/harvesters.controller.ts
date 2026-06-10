import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { HarvesterStatus } from '@wh/shared';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { HarvestersService } from './harvesters.service';
import { CreateHarvesterDto, UpdateHarvesterDto } from './dto/harvester.dto';

@Controller('harvesters')
export class HarvestersController {
  constructor(private readonly harvesters: HarvestersService) {}

  @Post()
  create(@Body() dto: CreateHarvesterDto, @CurrentUser() user: AuthUser) {
    return this.harvesters.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('status') status?: HarvesterStatus) {
    return this.harvesters.findAll(user.tenantId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.harvesters.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHarvesterDto, @CurrentUser() user: AuthUser) {
    return this.harvesters.update(id, dto, user);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.harvesters.setStatus(id, HarvesterStatus.ACTIVE, user);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.harvesters.setStatus(id, HarvesterStatus.INACTIVE, user);
  }
}
