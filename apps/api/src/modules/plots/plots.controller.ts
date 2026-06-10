import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlotsService } from './plots.service';
import { CreatePlotDto, UpdatePlotDto } from './dto/plot.dto';

@Controller('plots')
export class PlotsController {
  constructor(private readonly plots: PlotsService) {}

  @Post()
  create(@Body() dto: CreatePlotDto, @CurrentUser() user: AuthUser) {
    return this.plots.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('harvesterId') harvesterId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.plots.findAll(user, { harvesterId, customerId });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.plots.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlotDto, @CurrentUser() user: AuthUser) {
    return this.plots.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.plots.remove(id, user);
  }
}
