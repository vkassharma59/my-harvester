import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PartyType } from '@wh/shared';

export class CreatePaymentDto {
  /** Client-generated id for offline creates (idempotent on replay). */
  @IsOptional()
  @IsMongoId()
  id?: string;

  @IsEnum(PartyType)
  partyType!: PartyType;

  @IsMongoId()
  partyId!: string;

  @IsOptional()
  @IsMongoId()
  plotId?: string;

  @IsOptional()
  @IsMongoId()
  harvesterId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}

export class QueryPaymentDto {
  @IsOptional()
  @IsEnum(PartyType)
  partyType?: PartyType;

  @IsOptional()
  @IsMongoId()
  partyId?: string;

  @IsOptional()
  @IsMongoId()
  harvesterId?: string;
}
