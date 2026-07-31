import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumberString,
  Length,
  MaxLength,
  Matches,
} from 'class-validator';

const IMAGE_DATA_URL_REGEX =
  /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/i;
const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;

// Represents the parameters accepted when creating or editing the contractor's company profile
export class UpsertCompanySettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    example: 'Acme Construction Ltd.',
    description: 'Name of the contractor company',
    required: false,
    nullable: true,
  })
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiProperty({
    example: 'General contractor specializing in residential renovations',
    description: 'Description of the contractor company',
    required: false,
    nullable: true,
  })
  description?: string | null;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  @Length(9, 9)
  @ApiProperty({
    example: '515123456',
    description:
      'Israeli company registration number of the contractor, 9 digits',
    required: false,
    nullable: true,
  })
  companyNumber?: string | null;

  @IsOptional()
  @IsString()
  @Matches(IMAGE_DATA_URL_REGEX, {
    message: 'logo must be a base64 data URL (png, jpg, or webp)',
  })
  @MaxLength(MAX_IMAGE_DATA_URL_LENGTH)
  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    description: 'Base64 data URL of the company logo image',
    required: false,
    nullable: true,
  })
  logo?: string | null;

  @IsOptional()
  @IsString()
  @Matches(IMAGE_DATA_URL_REGEX, {
    message: 'signature must be a base64 data URL (png, jpg, or webp)',
  })
  @MaxLength(MAX_IMAGE_DATA_URL_LENGTH)
  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    description: "Base64 data URL of the contractor's signature image",
    required: false,
    nullable: true,
  })
  signature?: string | null;
}
