import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents basic project properties nested in project report responses.
 */
export class NestedProjectDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project',
  })
  id!: string;

  @ApiProperty({
    example: 'Office Building Renovation',
    description: 'Name of the project',
  })
  name!: string;

  @ApiProperty({
    example: 'Renovation of the office building located at 123 Main St.',
    description: 'A description of the project',
  })
  description!: string;

  @ApiProperty({
    example: '123 Main St, Tel Aviv',
    description: 'Location of the project',
  })
  location!: string;

  @ApiProperty({
    example: 'Jane Doe',
    description:
      'Name of the person who commissioned this specific project (may differ from the client)',
  })
  requesterName!: string;

  @ApiProperty({
    example: 'Yaniv Goldman',
    description:
      "Name of the project's initiator (יזם), if one exists — null when the project has no initiator",
    nullable: true,
  })
  initiatorName!: string | null;
}
