import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object representing a nested project report.
 */
export class NestedProjectReportDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project report',
  })
  id!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project',
  })
  projectId!: string;

  @ApiProperty({
    example: 'Project Alpha',
    description: 'Name of the project',
  })
  projectName!: string;
}
