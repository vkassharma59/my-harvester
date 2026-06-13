import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateFuelPumpDto {
  /** Client-generated id for offline creates (idempotent on replay). */
  @IsOptional()
  @IsMongoId()
  id?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  harvesterIds!: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFuelPumpDto extends PartialType(CreateFuelPumpDto) {}
