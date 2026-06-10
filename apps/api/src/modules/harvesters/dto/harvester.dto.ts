import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { HarvesterStatus, HarvesterType } from '@wh/shared';

export class CreateHarvesterDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  registrationNo?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsEnum(HarvesterStatus)
  status?: HarvesterStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(HarvesterType)
  type!: HarvesterType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ratePerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rateWithBhusa?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rateWithoutBhusa?: number;
}

export class UpdateHarvesterDto extends PartialType(CreateHarvesterDto) {}
