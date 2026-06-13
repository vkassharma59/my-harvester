import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { FuelPumpsService } from './fuel-pumps.service';
import { CreateFuelPumpDto, UpdateFuelPumpDto } from './dto/fuel-pump.dto';

/** Fuel pumps are managed by staff admins and the super admin alike. */
@Controller('fuel-pumps')
export class FuelPumpsController {
  constructor(private readonly pumps: FuelPumpsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('harvesterId') harvesterId?: string) {
    return this.pumps.findAll(user, harvesterId);
  }

  @Get(':id/ledger')
  ledger(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.pumps.ledger(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.pumps.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateFuelPumpDto, @CurrentUser() user: AuthUser) {
    return this.pumps.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFuelPumpDto, @CurrentUser() user: AuthUser) {
    return this.pumps.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.pumps.remove(id, user);
  }
}
