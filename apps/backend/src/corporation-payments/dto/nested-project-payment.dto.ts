import { ApiProperty } from '@nestjs/swagger';
import { NestedProjectReportDto } from './nested-project-report.dto';

/**
 * Data Transfer Object representing a nested project payment.
 * This DTO is used to structure the data for a project payment when it is included as part of a larger response,
 * such as when fetching corporation payment details. It includes information about the project report,
 * the amount paid, and the date of service.
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
  })
  projectReport!: NestedProjectReportDto;

  @ApiProperty({
    example: 5000,
    description: 'The amount paid to the corporation for this project',
  })
  amount!: number;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date the service was provided for this payment',
    format: 'ISO-8601',
  })
  date!: string;
}
