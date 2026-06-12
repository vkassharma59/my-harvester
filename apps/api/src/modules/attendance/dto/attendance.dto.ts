import { IsArray, IsMongoId, IsString, Matches } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SetWeekDto {
  @IsMongoId()
  labourId!: string;

  /** Monday of the week, 'YYYY-MM-DD'. */
  @IsString()
  @Matches(ISO_DATE)
  weekStart!: string;

  /** The present days in the week, each 'YYYY-MM-DD'. */
  @IsArray()
  @IsString({ each: true })
  @Matches(ISO_DATE, { each: true })
  days!: string[];
}
