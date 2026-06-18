import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnerDetails } from './owner-details.schema';
import { OwnerDetailsService } from './owner-details.service';

/** Owns the per-owner additional-details table (state, district, … extensible). */
@Module({
  imports: [TypeOrmModule.forFeature([OwnerDetails])],
  providers: [OwnerDetailsService],
  exports: [OwnerDetailsService, TypeOrmModule],
})
export class OwnerDetailsModule {}
