import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents the parameters of a project as returned by the API.
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
    example: 'Office Building Renovation',
    description: 'Name of the project',
  })
  name!: string;

  @ApiProperty({
    example: 150000.5,
    description: 'Estimated amount for the project',
    type: 'number',
  })
  estimatedAmount!: number;

  @ApiProperty({
    example: '2024-12-31',
    description: 'Expected finish date of the project',
    type: 'string',
    format: 'date',
  })
  finishDate!: string;
}
