import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents basic corporation properties nested in project report responses.
 */
export class NestedCorporationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the corporation',
  })
  id!: string;

  @ApiProperty({
    example: 'Tech Innovators Inc.',
    description: 'Name of the company',
  })
  name!: string;
}
