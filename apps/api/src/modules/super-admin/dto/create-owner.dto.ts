import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Onboard a new harvester-business owner from the console (the sales-close flow). */
export class CreateOwnerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'Enter a valid email address.' })
  email!: string;

  /** 10-digit mobile — also a login identity. */
  @Matches(/^\d{10}$/, { message: 'Enter a valid 10-digit mobile number.' })
  phone!: string;

  /** Owner's initial password (generated in the console, emailed to the owner). */
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

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
}
