import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Edit a tenant's business profile + super-admin notes (not its subscription). */
export class UpdateOwnerDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  verifiedPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  machineNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  soldBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
