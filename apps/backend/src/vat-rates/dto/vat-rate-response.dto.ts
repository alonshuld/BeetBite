import { ApiProperty } from '@nestjs/swagger';

export class VatRateResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the VAT rate entry',
  })
  id!: string;

  @ApiProperty({
    example: '2026-04-01T00:00:00.000Z',
    description: 'The month this VAT percentage becomes effective from',
    format: 'ISO-8601',
  })
  effectiveMonth!: string;

  @ApiProperty({
    example: 18,
    description: 'VAT percentage effective from this month onward',
  })
  percentage!: number;

  @ApiProperty({
    example: '2026-04-01T09:00:00.000Z',
    description: 'When this VAT rate entry was created',
    format: 'ISO-8601',
  })
  createdAt!: string;
}
