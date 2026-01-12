import { ApiProperty } from '@nestjs/swagger';

export class SubcontractorResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the subcontractor',
  })
  id!: string;

  @ApiProperty({
    example: 'Quality Builders LLC',
    description: 'Name of the subcontractor',
  })
  name!: string;
}
