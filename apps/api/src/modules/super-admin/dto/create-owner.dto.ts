import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Onboard a new harvester-business owner from the console (the sales-close flow). */
export class CreateOwnerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  /** Mobile number — also a login identity. OTP verification is layered on later. */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  phone?: string;

  /** Defaults to the owner's name when omitted. */
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
  @MaxLength(40)
  machineNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  soldBy?: string;

  /** If omitted, a readable password is generated and returned once. */
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
