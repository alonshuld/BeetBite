import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString, Length } from 'class-validator';

export class CreateSubcontractorDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Quality Builders LLC',
    description: 'Name of the subcontractor',
    type: 'string',
  })
  name!: string;

  @IsNumberString({ no_symbols: true })
  @Length(9, 9)
  @ApiProperty({
    example: '515123456',
    description:
      'Israeli company registration number of the private company, 9 digits',
    type: 'string',
  })
  companyNumber!: string;
}
