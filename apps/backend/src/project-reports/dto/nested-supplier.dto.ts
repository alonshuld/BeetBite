import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents basic supplier properties nested in project report responses.
 */
export class NestedSupplierDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the supplier',
  })
  id!: string;

  @ApiProperty({
    example: 'Tech Innovators Inc.',
    description: 'Name of the company',
  })
  name!: string;
}
