import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeReportSubcontractorDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'cmb1member2',
    description:
      'The team member who takes the project this month — must be in the same team as the current subcontractor',
  })
  subcontractorId!: string;
}
