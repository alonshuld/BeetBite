import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object representing a nested project report.
 * This DTO is used to structure the data for a project report when it is included as part of a larger response,
 * such as when fetching corporation payment details. It includes information about the project report's unique identifier,
 * the associated project, and the name of the project.
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
