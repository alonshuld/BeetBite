import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSubcontractorDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Quality Builders LLC',
    description: 'Name of the subcontractor',
    type: 'string',
  })
  name!: string;
}
