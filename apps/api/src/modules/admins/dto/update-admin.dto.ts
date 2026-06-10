import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^[0-9]{10}$/, { message: 'phone must be a 10-digit mobile number' })
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  harvesterIds?: string[];
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
