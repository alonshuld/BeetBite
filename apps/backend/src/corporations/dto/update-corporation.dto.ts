import { PartialType } from '@nestjs/swagger';
import { CreateCorporationDto } from './create-corporation.dto';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCorporationDto extends PartialType(CreateCorporationDto) {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Tech Innovators Inc.',
    description: 'Name of the corporation',
  })
  name: string;
}
