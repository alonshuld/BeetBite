import { ApiProperty } from '@nestjs/swagger';
import { NestedProjectWithClientDto } from './nested-project-with-client.dto';
import { NestedSubcontractorDto } from './nested-subcontractor.dto';
import { IncomeEntryResponseDto } from './income-entry-response.dto';
import { NestedCorporationPaymentDto } from './nested-corporation-payment.dto';

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
    description: 'Corporation payments for this report',
    type: [NestedCorporationPaymentDto],
  })
  corporationPayments!: NestedCorporationPaymentDto[];
}
