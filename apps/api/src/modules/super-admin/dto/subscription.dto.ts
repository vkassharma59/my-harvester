import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PaymentMethod, Plan } from '@wh/shared';

/** Extend a tenant's free trial by a number of months. */
export class ExtendTrialDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  months!: number;
}

/** Manually record a cash/UPI subscription payment (extends the paid period). */
export class RecordPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  /** When the money was received. Defaults to now. */
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  /** Length of the paid period this payment buys, in months. Defaults to 12. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  periodMonths?: number;
}

/** Manually set a tenant's plan (e.g. correcting a record). */
export class ChangePlanDto {
  @IsEnum(Plan)
  plan!: Plan;
}

/** Reset an owner's login password; generates one when omitted. */
export class ResetPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
