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
  MinLength,
} from 'class-validator';
import { AreaUnit, HarvestType } from '@wh/shared';

export class CreatePlotDto {
  @IsMongoId()
  customerId!: string;

  @IsMongoId()
  harvesterId!: string;

  @IsString()
  @MinLength(1)
  plotName!: string;

  @IsOptional()
  @IsString()
  village?: string;

  @IsNumber()
  @Min(0)
  area!: number;

  @IsOptional()
  @IsEnum(AreaUnit)
  areaUnit?: AreaUnit;

  @Type(() => Date)
  @IsDate()
  harvestDate!: Date;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsEnum(HarvestType)
  harvestType!: HarvestType;

  /** Optional — falls back to the configured default rate per Bigha. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  ratePerBigha?: number;

  // Type 2 (WITHOUT_BHUSA): the buyer of the Bhusa and the agreed amount.
  @IsOptional()
  @IsMongoId()
  bhusaBuyerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bhusaAmount?: number;

  /** Optional commission agent for this job (must belong to the same harvester).
   *  null/empty clears any existing agent. */
  @IsOptional()
  @IsMongoId()
  agentId?: string | null;
}

export class UpdatePlotDto extends PartialType(CreatePlotDto) {}
