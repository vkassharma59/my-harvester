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
  ValidateIf,
} from 'class-validator';
import { ExpenseType } from '@wh/shared';

export class CreateExpenseDto {
  /** Client-generated id for offline creates (idempotent on replay). */
  @IsOptional()
  @IsMongoId()
  id?: string;

  @IsMongoId()
  harvesterId!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsEnum(ExpenseType)
  type!: ExpenseType;

  /** A super-admin-defined category id, or null for a built-in type. */
  @IsOptional()
  @ValidateIf((o) => o.categoryId !== null && o.categoryId !== undefined)
  @IsMongoId()
  categoryId?: string | null;

  /** The fuel pump a DIESEL expense was bought from, or null. */
  @IsOptional()
  @ValidateIf((o) => o.pumpId !== null && o.pumpId !== undefined)
  @IsMongoId()
  pumpId?: string | null;

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
