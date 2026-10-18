import { ApiProperty } from '@nestjs/swagger';
import { IncomeEntryResponseDto } from 'src/project-reports/dto/income-entry-response.dto';

export class MonthlyIncomeProjectDto {
  @ApiProperty({ description: "The project's report for the month" })
  reportId!: string;
  @ApiProperty() projectId!: string;
  @ApiProperty() projectName!: string;
  @ApiProperty({ description: 'Who ordered the project (מזמין)' })
  requesterName!: string;
  @ApiProperty({ description: 'Income for the month, excluding VAT' })
  totalIncome!: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'VAT rate for the month; null when no rate is configured for it yet',
  })
  vatPercentage!: number | null;
  @ApiProperty() vatAmount!: number;
  @ApiProperty({ description: 'Income plus VAT' })
  totalWithVat!: number;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The day the income was paid; null while unpaid',
  })
  incomePaidAt!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The day the VAT was paid; null while unpaid',
  })
  vatPaidAt!: string | null;
  @ApiProperty({
    type: [IncomeEntryResponseDto],
    description: 'The individual income entries behind totalIncome',
  })
  incomeEntries!: IncomeEntryResponseDto[];
}

export class MonthlyIncomeItemDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty({ type: [MonthlyIncomeProjectDto] })
  projects!: MonthlyIncomeProjectDto[];
  @ApiProperty() totalIncome!: number;
  @ApiProperty({ description: 'Income already marked paid' })
  incomePaid!: number;
  @ApiProperty() totalVat!: number;
  @ApiProperty({ description: 'VAT already marked paid' })
  vatPaid!: number;
  @ApiProperty() totalWithVat!: number;
}
