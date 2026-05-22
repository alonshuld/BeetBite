import { ApiProperty } from '@nestjs/swagger';
import { ProjectPaymentProgressDto } from './project-payment-progress.dto';

export class ProjectClientDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Acme Corp' })
  name!: string;
}

/**
 * Represents the parameters of a project as returned by the API (with payment progress aggregation).
 */
export class ProjectResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project',
  })
  id!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the client that owns this project',
  })
  clientId!: string;

  @ApiProperty({
    description: 'Client that owns this project',
    type: () => ProjectClientDto,
    nullable: true,
  })
  client!: ProjectClientDto | null;

  @ApiProperty({
    example: 'Office Building Renovation',
    description: 'Name of the project',
  })
  name!: string;

  @ApiProperty({
    example: 150000.5,
    description: 'Estimated amount for the project',
  })
  estimatedAmount!: number;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'Expected finish date of the project in the ISO-8601 format',
    format: 'ISO-8601',
  })
  finishDate!: string;

  @ApiProperty({
    example: 'Renovation of the office building located at 123 Main St.',
    description: 'A description of the project',
    type: 'string',
  })
  description!: string;

  @ApiProperty({
    description: 'The payment progress the client has made on the project',
    type: () => ProjectPaymentProgressDto,
  })
  paymentProgress!: ProjectPaymentProgressDto;

  @ApiProperty({
    example: false,
    description: 'Whether the project is closed/done',
    type: 'boolean',
  })
  isDone!: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether the project has any reports',
    type: 'boolean',
  })
  hasReports!: boolean;
}
