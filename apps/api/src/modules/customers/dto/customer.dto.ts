import { PartialType } from '@nestjs/mapped-types';
import { IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  /** Client-generated id for offline creates (idempotent on replay). */
  @IsOptional()
  @IsMongoId()
  id?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  phone!: string;

  @IsOptional()
  @IsString()
  village?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  deviceContactId?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
