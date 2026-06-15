import { IsEnum } from 'class-validator';
import { BugStatus } from '@wh/shared';

export class BugStatusDto {
  @IsEnum(BugStatus)
  status!: BugStatus;
}
