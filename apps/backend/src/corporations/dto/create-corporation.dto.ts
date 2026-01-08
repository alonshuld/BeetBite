import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCorporationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Tech Innovators Inc.',
    description: 'Name of the corporation',
  })
  name: string;
}
