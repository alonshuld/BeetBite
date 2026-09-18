import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateInitiatorDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Yaniv Goldman',
    description: 'Name of the initiator',
    type: 'string',
  })
  name!: string;
}
