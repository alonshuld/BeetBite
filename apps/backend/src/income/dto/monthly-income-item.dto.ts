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
  @ApiProperty({ description: 'Whether the client pays VAT on top this month' })
  incomeIncludesVat!: boolean;
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'VAT rate for the month when VAT is on; null when off or no rate is configured for the month',
  })
  vatPercentage!: number | null;
  @ApiProperty() vatAmount!: number;
  @ApiProperty({ description: 'What the client pays: income plus VAT' })
  totalWithVat!: number;
  @ApiProperty({ description: "Sum of the client's payments for the month" })
  receivedIncome!: number;
  @ApiProperty({ description: 'totalWithVat still unpaid, never below zero' })
  pendingIncome!: number;
  @ApiProperty() profit!: number;
  @ApiProperty({
    type: [IncomeEntryResponseDto],
    description: 'The individual income entries behind totalIncome',
  })
  incomeEntries!: IncomeEntryResponseDto[];
  @ApiProperty({
    type: [ClientPaymentResponseDto],
    description: "The client's partial payments, oldest payment date first",
  })
  payments!: ClientPaymentResponseDto[];
}

export class MonthlyIncomeItemDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty({ type: [MonthlyIncomeProjectDto] })
  projects!: MonthlyIncomeProjectDto[];
  @ApiProperty() totalIncome!: number;
  @ApiProperty() totalVat!: number;
  @ApiProperty() totalWithVat!: number;
  @ApiProperty() totalReceived!: number;
  @ApiProperty() totalProfit!: number;
}
