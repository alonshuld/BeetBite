import { ApiProperty } from '@nestjs/swagger';
import { NestedCorporationPaymentDto } from './nested-corporation-payment.dto';
import { NestedProjectDto } from './nested-project.dto';
import { NestedSubcontractorWithPaymentDto } from './nested-subcontractor-with-payment.dto';

/**
 * Represents a full enriched project report response.
 */
export class ProjectReportResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project report',
  })
  id!: string;

  @ApiProperty({
    description: "Information on the report's project",
    type: NestedProjectDto,
  })
  project!: NestedProjectDto;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: "The project report's date",
    format: 'ISO-8601',
  })
  date!: string;

  @ApiProperty({
    example: 6,
    description: 'The profit margin for the project',
  })
  profitMargin!: number;

  @ApiProperty({
    example: 2000,
    description: 'The profit made from the project in the given month',
  })
  profit!: number;

  @ApiProperty({
    example: 100000,
    description:
      'The amount of money the client paid for the project that month',
  })
  income!: number;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description:
      'The exact date the client actually made the payment (if at all)',
    format: 'ISO-8601',
  })
  incomeDate?: string;

  @ApiProperty({
    description:
      'The payments made to corporations for their work on the project that month',
    type: [NestedCorporationPaymentDto],
  })
  corporationPayments!: NestedCorporationPaymentDto[];

  @ApiProperty({
    description:
      "Subcontractor information for the given month's project report",
    type: NestedSubcontractorWithPaymentDto,
  })
  subcontractor!: NestedSubcontractorWithPaymentDto;
}
