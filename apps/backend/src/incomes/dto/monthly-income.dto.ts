import { ApiProperty } from '@nestjs/swagger';
import { MonthIncomeProjectDto } from './month-income-project.dto';

export class MonthlyIncomeDto {
  @ApiProperty({
    example: '2026-01',
    description: 'Month in YYYY-MM format',
  })
  month!: string;

  @ApiProperty({
    description: 'Projects with income details for this month',
    type: [MonthIncomeProjectDto],
  })
  projects!: MonthIncomeProjectDto[];
}
