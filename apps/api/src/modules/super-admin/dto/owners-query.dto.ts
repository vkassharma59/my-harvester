import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SubscriptionStatus } from '@wh/shared';

/** Query params for the super-admin "Owners" table. */
export class OwnersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 20;

  /** Free-text match on business name, region, or the owner's name/email/phone. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}
