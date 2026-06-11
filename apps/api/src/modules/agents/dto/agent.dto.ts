import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsMongoId, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsMongoId()
  harvesterId!: string;

  @IsNumber()
  @Min(0)
  commissionRate!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAgentDto extends PartialType(CreateAgentDto) {}
