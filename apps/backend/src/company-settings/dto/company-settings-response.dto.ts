import { ApiProperty } from '@nestjs/swagger';
import { PDF_FONTS } from 'src/common/pdf-fonts';

// Represents the contractor's company profile as returned by the API
export class CompanySettingsResponseDto {
  @ApiProperty({
    example: 'company-settings',
    description: 'Fixed identifier of the singleton company settings record',
  })
  id!: string;

  @ApiProperty({
    example: 'Acme Construction Ltd.',
    description: 'Name of the contractor company',
    nullable: true,
  })
  name!: string | null;

  @ApiProperty({
    example: 'General contractor specializing in residential renovations',
    description: 'Description of the contractor company',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    example: '515123456',
    description:
      'Israeli company registration number of the contractor, 9 digits',
    nullable: true,
  })
  companyNumber!: string | null;

  @ApiProperty({
    example: '+972501234567',
    description: 'Phone number of the contractor company',
    nullable: true,
  })
  phone!: string | null;

  @ApiProperty({
    example: 'info@acme-construction.com',
    description: 'Email address of the contractor company',
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({
    example: '12 Herzl St.',
    description: 'Street address of the contractor company',
    nullable: true,
  })
  addressStreet!: string | null;

  @ApiProperty({
    example: 'Tel Aviv',
    description: 'City of the contractor company',
    nullable: true,
  })
  addressCity!: string | null;

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    description: 'Base64 data URL of the company logo image',
    nullable: true,
  })
  logo!: string | null;

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    description: "Base64 data URL of the contractor's signature image",
    nullable: true,
  })
  signature!: string | null;

  @ApiProperty({
    example: '#1f2a44',
    description:
      'Primary brand color of exported PDFs (header band, table headers), as #rrggbb',
  })
  pdfPrimaryColor!: string;

  @ApiProperty({
    example: '#c9a24b',
    description:
      'Secondary brand color of exported PDFs (accent rules, badges, totals), as #rrggbb',
  })
  pdfSecondaryColor!: string;

  @ApiProperty({
    example: 'noto-sans-hebrew',
    description: 'Font of exported PDFs',
    enum: PDF_FONTS,
  })
  pdfFont!: string;

  @ApiProperty({
    example: '2026-07-31T10:39:08.000Z',
    description: 'Timestamp of the last update to the company settings',
  })
  updatedAt!: string;
}
