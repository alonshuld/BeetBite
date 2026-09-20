import { ApiProperty } from '@nestjs/swagger';

export class MonthlyIncomeProjectDto {
  @ApiProperty() projectId!: string;
  @ApiProperty() projectName!: string;
  @ApiProperty() totalIncome!: number;
  @ApiProperty() receivedIncome!: number;
  @ApiProperty() pendingIncome!: number;
  @ApiProperty() profit!: number;
}

export class MonthlyIncomeItemDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty({ type: [MonthlyIncomeProjectDto] })
  projects!: MonthlyIncomeProjectDto[];
  @ApiProperty() totalIncome!: number;
  @ApiProperty() totalProfit!: number;
}
