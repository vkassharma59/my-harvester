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
import { ExpenseType } from '@wh/shared';

export class CreateExpenseDto {
  @IsMongoId()
  harvesterId!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsEnum(ExpenseType)
  type!: ExpenseType;

  /** Required in practice for LABOUR expenses (links the payment to a labourer). */
  @IsOptional()
  @IsMongoId()
  labourId?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
