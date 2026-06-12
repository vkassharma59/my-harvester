import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateExpenseCategoryDto extends PartialType(CreateExpenseCategoryDto) {}
