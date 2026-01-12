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
}
