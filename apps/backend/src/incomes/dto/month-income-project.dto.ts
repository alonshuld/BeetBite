import { ApiProperty } from '@nestjs/swagger';

export class MonthIncomeProjectDto {
  @ApiProperty({
    example: 'proj-123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project',
  })
  projectId!: string;

  @ApiProperty({
    example: 'Campus Nvidia',
    description: 'Name of the project',
  })
  projectName!: string;

  @ApiProperty({
    example: 123456.78,
    description: 'Income for this project in this month',
  })
  income!: number;

  @ApiProperty({
    example: 'paid',
    enum: ['pending', 'paid'],
    description: 'pending = incomeDate is null, paid = incomeDate is set',
  })
  incomeStatus!: 'pending' | 'paid';

  @ApiProperty({
    example: 42.5,
    description:
      'Percentage of project estimated amount covered by all paid incomes',
  })
  completionPercent!: number;
}
