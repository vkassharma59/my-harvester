import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './admin.schema';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin])],
  controllers: [AdminsController],
  providers: [AdminsService],
  exports: [AdminsService],
})
export class AdminsModule {}
