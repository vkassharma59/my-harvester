import { IsString, MinLength } from 'class-validator';

/** Clearing all tenant data requires the owner to re-enter their password. */
export class ClearDataDto {
  @IsString()
  @MinLength(1)
  password!: string;
}
