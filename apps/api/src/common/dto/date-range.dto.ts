import { Type } from 'class-transformer';
import { IsDate, IsMongoId, IsOptional } from 'class-validator';

/** Common query filters used across expenses, labour, plots and payments. */
export class HarvesterDateRangeDto {
  @IsOptional()
  @IsMongoId()
  harvesterId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
