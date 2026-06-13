import {
  Body,
  Controller,
  Delete,
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
import { ExpenseCategoriesService } from './expense-categories.service';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from './dto/expense-category.dto';

/** All admins can read categories; only the OWNER may manage them. */
@Controller('expense-categories')
@UseGuards(RolesGuard)
export class ExpenseCategoriesController {
  constructor(private readonly categories: ExpenseCategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.categories.findAll(user);
  }

  @Post()
  @Roles(Role.OWNER)
  create(@Body() dto: CreateExpenseCategoryDto, @CurrentUser() user: AuthUser) {
    return this.categories.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.categories.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.categories.remove(id, user);
  }
}
