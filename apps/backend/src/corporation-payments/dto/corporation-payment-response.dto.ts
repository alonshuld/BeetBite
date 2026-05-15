import { ApiProperty } from '@nestjs/swagger';
import { NestedCorporationDto } from './nested-corporation.dto';
import { NestedProjectReportDto } from './nested-project-report.dto';

/**
 * Data Transfer Object representing the response for a corporation payment.
 */
export class CorporationPaymentResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the corporation payment',
  })
  id!: string;

  @ApiProperty({
    description:
      'Information about the project report associated with the payment',
    type: NestedProjectReportDto,
  })
  projectReport!: NestedProjectReportDto;

  @ApiProperty({
    description: 'Information about the corporation receiving the payment',
    type: NestedCorporationDto,
  })
  corporation!: NestedCorporationDto;

  @ApiProperty({
    example: 5000,
    description: 'The total amount paid to the corporation for this payment',
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
    example: 18,
    description: 'VAT percentage — only applicable when isFuture is false',
    nullable: true,
  })
  vatPercentage!: number | null;
}
