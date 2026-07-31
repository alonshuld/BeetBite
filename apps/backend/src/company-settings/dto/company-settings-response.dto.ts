import { ApiProperty } from '@nestjs/swagger';

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
    example: '2026-07-31T10:39:08.000Z',
    description: 'Timestamp of the last update to the company settings',
  })
  updatedAt!: string;
}
