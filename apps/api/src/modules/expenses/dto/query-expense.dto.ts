import { IsEnum, IsOptional } from 'class-validator';
import { ExpenseType } from '@wh/shared';
import { HarvesterDateRangeDto } from '../../../common/dto/date-range.dto';

export class QueryExpenseDto extends HarvesterDateRangeDto {
  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;
}
