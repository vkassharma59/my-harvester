import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AreaUnit } from '@wh/shared';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(AreaUnit)
  defaultAreaUnit?: AreaUnit;

  @IsOptional()
  @IsString()
  firmName?: string;
}
