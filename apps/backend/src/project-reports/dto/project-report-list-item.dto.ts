import { ApiProperty } from '@nestjs/swagger';
import { NestedProjectWithClientDto } from './nested-project-with-client.dto';
import { NestedSubcontractorDto } from './nested-subcontractor.dto';
import { IncomeEntryResponseDto } from './income-entry-response.dto';
import { NestedSupplierPaymentDto } from './nested-supplier-payment.dto';

export class ProjectReportListItemDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the project report',
  })
  id!: string;

  @ApiProperty({
    description: "Information on the report's project (including client)",
    type: NestedProjectWithClientDto,
  })
  project!: NestedProjectWithClientDto;

  @ApiProperty({
    description: "Information on the report's subcontractor",
    type: NestedSubcontractorDto,
  })
  subcontractor!: NestedSubcontractorDto;

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
    description: 'Supplier payments for this report',
    type: [NestedSupplierPaymentDto],
  })
  supplierPayments!: NestedSupplierPaymentDto[];

  @ApiProperty({
    example: 120000,
    nullable: true,
    description:
      "Income the project's initiator (יזם) reports for this month. Null unless set; only relevant for PDF export, and only meaningful when the project has an initiator.",
  })
  initiatorIncome!: number | null;
}
