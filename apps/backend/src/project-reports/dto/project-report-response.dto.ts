import { ApiProperty } from '@nestjs/swagger';
import { NestedSupplierPaymentDto } from './nested-supplier-payment.dto';
import { NestedInitiatorPaymentDto } from './nested-initiator-payment.dto';
import { NestedProjectDto } from './nested-project.dto';
import { NestedSubcontractorWithPaymentDto } from './nested-subcontractor-with-payment.dto';
import { IncomeEntryResponseDto } from './income-entry-response.dto';

export class ProjectReportResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project report',
  })
  id!: string;

  @ApiProperty({
    description: "Information on the report's project",
    type: NestedProjectDto,
  })
  project!: NestedProjectDto;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: "The project report's date",
    format: 'ISO-8601',
  })
  date!: string;

  @ApiProperty({
    example: 6,
    description: 'The profit margin for the project',
  })
  profitMargin!: number;

  @ApiProperty({
    example: 2000,
    description: 'The profit made from the project in the given month',
  })
  profit!: number;

  @ApiProperty({
    example: 100000,
    description: 'Total income computed from all income entries',
  })
  totalIncome!: number;

  @ApiProperty({
    description: 'Individual income entries for this report',
    type: [IncomeEntryResponseDto],
  })
  incomeEntries!: IncomeEntryResponseDto[];

  @ApiProperty({
    description:
      'The payments made to suppliers for their work on the project that month',
    type: [NestedSupplierPaymentDto],
  })
  supplierPayments!: NestedSupplierPaymentDto[];

  @ApiProperty({
    description:
      "Documentation-only payments to the project's initiator this month, if it has one",
    type: [NestedInitiatorPaymentDto],
  })
  initiatorPayments!: NestedInitiatorPaymentDto[];

  @ApiProperty({
    description:
      "Subcontractor information for the given month's project report",
    type: NestedSubcontractorWithPaymentDto,
  })
  subcontractor!: NestedSubcontractorWithPaymentDto;
}
