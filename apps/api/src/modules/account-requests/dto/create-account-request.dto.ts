import { IsEmail, IsInt, IsString, Max, Min, MinLength } from 'class-validator';

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

  @IsString()
  @MinLength(6)
  password!: string;
}
