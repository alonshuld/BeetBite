import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents basic initiator properties nested in project report responses.
 */
export class NestedInitiatorDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the initiator',
  })
  id!: string;

  @ApiProperty({
    example: 'Yaniv Goldman',
    description: 'Name of the initiator',
  })
  name!: string;
}
