import { ApiProperty } from '@nestjs/swagger';
import { NestedProjectReportDto } from './nested-project-report.dto';

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
