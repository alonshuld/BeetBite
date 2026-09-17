import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents the parameters of a project as returned by the API (basic, without payment progress).
 */
export class ProjectBasicResponseDto {
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
    example: 'Renovation of the office building located at 123 Main St.',
    description: 'A description of the project',
    type: 'string',
  })
  description!: string;

  @ApiProperty({
    example: false,
    description: 'Whether the project is closed/done',
    type: 'boolean',
  })
  isDone!: boolean;

  @ApiProperty({
    example: 'עבודות שלד + גמר',
    description:
      "The 'approved for' text used on this project's most recent PDF export, prefilled on the next export",
    type: 'string',
    nullable: true,
  })
  lastApprovedFor!: string | null;
}
