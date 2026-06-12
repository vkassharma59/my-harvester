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
import { LabourService } from './labour.service';
import { CreateLabourDto, UpdateLabourDto } from './dto/labour.dto';

@Controller('labour')
export class LabourController {
  constructor(private readonly labour: LabourService) {}

  @Post()
  create(@Body() dto: CreateLabourDto, @CurrentUser() user: AuthUser) {
    return this.labour.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('harvesterId') harvesterId?: string) {
    return this.labour.findAll(user, harvesterId);
  }

  @Get(':id/ledger')
  ledger(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.labour.ledger(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.labour.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLabourDto, @CurrentUser() user: AuthUser) {
    return this.labour.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.labour.remove(id, user);
  }
}
