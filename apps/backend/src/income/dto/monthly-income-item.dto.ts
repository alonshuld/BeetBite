import { ApiProperty } from '@nestjs/swagger';
import { IncomeEntryResponseDto } from 'src/project-reports/dto/income-entry-response.dto';

export class MonthlyIncomeProjectDto {
  @ApiProperty() projectId!: string;
  @ApiProperty() projectName!: string;
  @ApiProperty() totalIncome!: number;
  @ApiProperty() receivedIncome!: number;
  @ApiProperty() pendingIncome!: number;
  @ApiProperty() profit!: number;
  @ApiProperty({
    type: [IncomeEntryResponseDto],
    description:
      'The individual income entries behind totalIncome, each received or pending by its incomeDate',
  })
  incomeEntries!: IncomeEntryResponseDto[];
}

export class MonthlyIncomeItemDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty({ type: [MonthlyIncomeProjectDto] })
  projects!: MonthlyIncomeProjectDto[];
  @ApiProperty() totalIncome!: number;
  @ApiProperty() totalProfit!: number;
}
