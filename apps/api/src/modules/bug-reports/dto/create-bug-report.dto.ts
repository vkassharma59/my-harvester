import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBugReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description!: string;

  /** Optional screenshot URL (already uploaded via /uploads). */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  screenshotUrl?: string;
}
