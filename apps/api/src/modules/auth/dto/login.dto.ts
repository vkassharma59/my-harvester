import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Email address or 10-digit mobile number. */
  @IsString()
  @MinLength(1)
  identifier!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
