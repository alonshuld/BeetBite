import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

// Represents the parameters required to update a client.
export class UpdateClientDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Name of the client',
    type: 'string',
  })
  name?: string;
}
