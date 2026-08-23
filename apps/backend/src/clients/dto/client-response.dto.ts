import { ApiProperty } from '@nestjs/swagger';

// Represents the parameters of a client as returned by the API
export class ClientResponseDto {
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
