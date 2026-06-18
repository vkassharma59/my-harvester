import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AccountRequestsService } from './account-requests.service';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';

@Controller('account-requests')
export class AccountRequestsController {
  constructor(private readonly service: AccountRequestsService) {}

  /** Public: anyone can request an owner account; the platform admin approves it. */
  @Public()
  @Post()
  create(@Body() dto: CreateAccountRequestDto) {
    return this.service.create(dto);
  }
}
