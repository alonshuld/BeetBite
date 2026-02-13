import { ApiProperty } from '@nestjs/swagger';
import { NestedProjectDto } from './nested-project.dto';
import { NestedSubcontractorDto } from './nested-subcontractor.dto';

/**
 * Represents the paraemters of a project report returned as part of a list, containing
 * less parameters.
 */
export class ProjectReportListItemDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project report',
  })
  id!: string;

  @ApiProperty({
    description: "Information on the report's project",
  })
  project!: NestedProjectDto;

  @ApiProperty({
    description: "Information on the report's subcontractor",
  })
  subcontractor!: NestedSubcontractorDto;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: "The project report's date",
    type: 'string',
    format: 'ISO-8601',
  })
  date!: string;

  @ApiProperty({
    example: 6,
    description: 'The profit margin for the project',
  })
  profitMargin!: number;

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
    type: 'string',
    format: 'ISO-8601',
  })
  incomeDate?: string;
}
