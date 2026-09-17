import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NestedProjectReportDto } from './nested-project-report.dto';

/**
 * Data Transfer Object representing a nested project payment.
 */
export class NestedProjectPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project payment',
  })
  id!: string;

  @ApiProperty({
    description:
      'Information about the project report this payment is associated with',
    type: NestedProjectReportDto,
  })
  projectReport!: NestedProjectReportDto;

  @ApiProperty({
    example: 5000,
    description: 'The amount paid to the supplier for this project',
  })
  amount!: number;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date the payment to the supplier was made',
    format: 'ISO-8601',
    nullable: true,
  })
  date!: string | null;

  @ApiProperty({
    example: 18,
    description: 'VAT percentage applied to this payment',
    nullable: true,
  })
  vatPercentage!: number | null;

  @ApiProperty({
    example: 900,
    description: 'VAT amount derived from vatPercentage × amount',
  })
  vatAmount!: number;

  @ApiProperty({
    example: 5900,
    description: 'Total amount including VAT',
  })
  effectiveTotal!: number;

  @ApiProperty({
    example: false,
    description: 'Whether this payment is for a future service',
  })
  isFuture!: boolean;

  @ApiPropertyOptional({
    example: 'Invoice #123',
    description: 'Optional description for this payment',
    nullable: true,
  })
  description!: string | null;
}
