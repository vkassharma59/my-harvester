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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, QueryPaymentDto, UpdatePaymentDto } from './dto/payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryPaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.payments.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.payments.remove(id, user.tenantId);
  }
}
