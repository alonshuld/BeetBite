import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents a corporation in a nested format, used within other DTOs.
 */
export class NestedCorporationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the corporation',
  })
  id!: string;

  @ApiProperty({
    example: 'Tech Solutions Inc.',
    description: 'Name of the corporation',
  })
  name!: string;
}
