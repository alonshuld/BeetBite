import { ApiProperty } from '@nestjs/swagger';
import { NestedCorporationDto } from './nested-corporation.dto';

/**
 * Represents basic project properties nested in project report responses.
 */
export class NestedCorporationPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the corporation payment',
  })
  id!: string;

  @ApiProperty({
    description: 'Information on the corporation',
  })
  corporation!: NestedCorporationDto;

  @ApiProperty({
    example: 20000,
    description: 'The amount of money paid to the corporation',
  })
  amount!: number;
}
