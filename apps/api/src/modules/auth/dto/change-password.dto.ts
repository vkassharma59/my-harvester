import { IsString, MaxLength, MinLength } from 'class-validator';

/** Change your own password (verifies the current one). */
export class ChangeOwnPasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  newPassword!: string;
}
