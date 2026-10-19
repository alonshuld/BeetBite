import { ApiProperty } from '@nestjs/swagger';
import { IncomeEntryResponseDto } from 'src/project-reports/dto/income-entry-response.dto';
import { ClientPaymentResponseDto } from './client-payment-response.dto';

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
    description: "What the client's payments towards the income add up to",
  })
  incomePaid!: number;
  @ApiProperty({
    type: [ClientPaymentResponseDto],
    description: 'The partial payments towards the income, oldest first',
  })
  payments!: ClientPaymentResponseDto[];
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
  @ApiProperty({ description: 'Sum of the payments towards the income' })
  incomePaid!: number;
  @ApiProperty() totalVat!: number;
  @ApiProperty({ description: 'VAT already marked paid' })
  vatPaid!: number;
  @ApiProperty() totalWithVat!: number;
}
