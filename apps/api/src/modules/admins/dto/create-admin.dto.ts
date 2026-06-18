import { IsArray, IsEmail, IsMongoId, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @MinLength(2)
  name!: string;

  /** Optional — staff admins can log in by mobile number instead. */
  @IsOptional()
  @IsEmail()
  email?: string;

  /** 10-digit mobile number — required and unique (used as a login identity). */
  @Matches(/^[0-9]{10}$/, { message: 'phone must be a 10-digit mobile number' })
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  /** Harvesters this staff admin may access. */
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  harvesterIds?: string[];
}
