import { IsEmail, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAccountRequestDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  /** Normalised to digits + validated (10 digits) in the service. */
  @IsString()
  mobile!: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  harvesterCount!: number;

  /** Indian State / UT (selected from the picker). */
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  state!: string;

  /** District within `state` (selected from the picker). */
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  district!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
