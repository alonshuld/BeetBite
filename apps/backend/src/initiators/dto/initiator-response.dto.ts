import { ApiProperty } from '@nestjs/swagger';

export class InitiatorResponseDto {
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
