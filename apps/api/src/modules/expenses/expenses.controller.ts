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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.expenses.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryExpenseDto, @CurrentUser() user: AuthUser) {
    return this.expenses.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.expenses.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.expenses.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.expenses.remove(id, user);
  }
}
