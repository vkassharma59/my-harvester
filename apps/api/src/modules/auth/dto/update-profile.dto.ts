import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Self-service profile update. Name is editable; a password change requires both
 * the current and new password. Email/phone are not editable here.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  newPassword?: string;
}
