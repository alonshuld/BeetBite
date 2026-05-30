import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NestedCorporationDto } from './nested-corporation.dto';

/**
 * Represents basic project properties nested in project report responses.
 */
export class NestedCorporationPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the corporation payment',
  })
  id!: string;

  @ApiProperty({
    description: 'Information on the corporation',
    type: NestedCorporationDto,
  })
  corporation!: NestedCorporationDto;

  @ApiProperty({
    example: 20000,
    description: 'The amount of money paid to the corporation',
  })
  amount!: number;

  @ApiPropertyOptional({
    example: 18,
    description: 'VAT percentage applicable to this payment',
    nullable: true,
  })
  vatPercentage?: number | null;

  @ApiPropertyOptional({
    example: 900,
    description: 'VAT amount (amount * vatPercentage / 100)',
  })
  vatAmount?: number;

  @ApiPropertyOptional({
    example: 23600,
    description: 'Effective total (amount + VAT amount)',
  })
  effectiveTotal?: number;
}
