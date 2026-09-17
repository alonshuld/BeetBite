import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Tech Innovators Inc.',
    description: 'Name of the supplier',
    type: 'string',
  })
  name!: string;
}
