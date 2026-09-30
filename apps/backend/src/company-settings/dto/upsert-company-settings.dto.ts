import { ApiProperty } from '@nestjs/swagger';
import { PDF_FONTS } from 'src/common/pdf-fonts';
import {
  IsOptional,
  IsString,
  IsNumberString,
  IsEmail,
  IsIn,
  IsPhoneNumber,
  Length,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

const IMAGE_DATA_URL_REGEX =
  /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/i;
const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;
// Colors are interpolated straight into the PDF stylesheet, so the strict hex
// shape is also what keeps arbitrary CSS out of it.
const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;

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
  @IsPhoneNumber()
  @ApiProperty({
    example: '+972501234567',
    description: 'Phone number of the contractor company',
    required: false,
    nullable: true,
  })
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @ApiProperty({
    example: 'info@acme-construction.com',
    description: 'Email address of the contractor company',
    required: false,
    nullable: true,
  })
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    example: '12 Herzl St.',
    description: 'Street address of the contractor company',
    required: false,
    nullable: true,
  })
  addressStreet?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    example: 'Tel Aviv',
    description: 'City of the contractor company',
    required: false,
    nullable: true,
  })
  addressCity?: string | null;

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

  // Omitting a color keeps the stored one; null is rejected rather than
  // accepted, since the column is non-nullable and always has a theme color.
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'pdfPrimaryColor must be a hex color like #1f2a44',
  })
  @ApiProperty({
    example: '#1f2a44',
    description:
      'Primary brand color of exported PDFs (header band, table headers), as #rrggbb',
    required: false,
  })
  pdfPrimaryColor?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'pdfSecondaryColor must be a hex color like #c9a24b',
  })
  @ApiProperty({
    example: '#c9a24b',
    description:
      'Secondary brand color of exported PDFs (accent rules, badges, totals), as #rrggbb',
    required: false,
  })
  pdfSecondaryColor?: string;

  // Like the colors: omitting it keeps the stored font, null is rejected. Only
  // listed ids pass, since the value picks a bundled font file to embed.
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(PDF_FONTS, {
    message: `pdfFont must be one of: ${PDF_FONTS.join(', ')}`,
  })
  @ApiProperty({
    example: 'noto-sans-hebrew',
    description: 'Font of exported PDFs',
    enum: PDF_FONTS,
    required: false,
  })
  pdfFont?: string;
}
