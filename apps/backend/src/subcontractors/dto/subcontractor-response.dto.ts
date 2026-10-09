import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({
    example: '515123456',
    description:
      'Israeli company registration number of the private company, 9 digits',
  })
  companyNumber!: string;

  @ApiPropertyOptional({
    example: 'cmb1team',
    description: 'The team this subcontractor works in, or null',
    type: String,
    nullable: true,
  })
  teamId!: string | null;
}
