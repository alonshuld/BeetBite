import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

// Represents the parameters required to create a new client
export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'John Doe',
    description: 'Name of the client',
    type: 'string',
  })
  name!: string;
}
