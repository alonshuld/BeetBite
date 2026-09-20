import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents basic client properties nested in project report responses.
 */
export class NestedClientDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the client',
  })
  id!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Name of the client',
  })
  name!: string;
}
