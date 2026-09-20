import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NestedSupplierDto } from './nested-supplier.dto';
import { NestedProjectReportDto } from './nested-project-report.dto';

/**
 * Data Transfer Object representing the response for a supplier payment.
 */
export class SupplierPaymentResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the supplier payment',
  })
  id!: string;

  @ApiProperty({
    description:
      'Information about the project report associated with the payment',
    type: NestedProjectReportDto,
  })
  projectReport!: NestedProjectReportDto;

  @ApiProperty({
    description: 'Information about the supplier receiving the payment',
    type: NestedSupplierDto,
  })
  supplier!: NestedSupplierDto;

  @ApiProperty({
    example: 5000,
    description: 'The total amount paid to the supplier for this payment',
  })
  amount!: number;

  @ApiProperty({
    example: '2024-06-01T00:00:00.000Z',
    description: 'The date when the payment was made',
    nullable: true,
  })
  date!: string | null;

  @ApiProperty({
    example: 'Invoice #123',
    description: 'Optional description for this payment',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    example: false,
    description: 'Whether this payment is for a future service',
  })
  isFuture!: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether this payment carries VAT',
  })
  includesVat!: boolean;

  @ApiProperty({
    example: 18,
    description:
      "Derived, never stored: the global VAT rate effective for the payment's report month. Null when VAT is off, or when no rate is configured for that month yet",
    nullable: true,
  })
  vatPercentage!: number | null;

  @ApiPropertyOptional({
    example: 900,
    description: 'VAT amount derived from amount * vatPercentage / 100',
  })
  vatAmount?: number;

  @ApiPropertyOptional({
    example: 5900,
    description: 'Effective total (amount + VAT amount)',
  })
  effectiveTotal?: number;
}
