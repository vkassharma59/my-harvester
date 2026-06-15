import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../admins/admin.schema';
import { AccountRequest } from './account-request.schema';
import { AccountRequestsController } from './account-requests.controller';
import { AccountRequestsService } from './account-requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountRequest, Admin])],
  controllers: [AccountRequestsController],
  providers: [AccountRequestsService],
  exports: [AccountRequestsService],
})
export class AccountRequestsModule {}
