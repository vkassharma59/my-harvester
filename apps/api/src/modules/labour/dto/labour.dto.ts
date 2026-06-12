import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { LabourType, PaymentStatus, WageType } from '@wh/shared';

export class CreateLabourDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  mobile!: string;

  @IsEnum(LabourType)
  type!: LabourType;

  @IsMongoId()
  harvesterId!: string;

  @IsOptional()
  @IsEnum(WageType)
  wageType?: WageType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyWage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customAmount?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

export class UpdateLabourDto extends PartialType(CreateLabourDto) {}
