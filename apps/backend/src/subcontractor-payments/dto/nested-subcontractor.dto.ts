import { ApiProperty } from '@nestjs/swagger';

/**
 * Nested DTO representing a subcontractor, used within other DTOs to provide subcontractor details without exposing all fields.
 */
export class NestedSubcontractorDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the subcontractor',
  })
  id!: string;

  @ApiProperty({
    example: 'Acme Subcontracting',
    description: 'Name of the subcontractor',
  })
  name!: string;
}
