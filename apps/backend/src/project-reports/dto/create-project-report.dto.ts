import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsISO8601,
  IsOptional,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { CreateSupplierPaymentDto } from './create-supplier-payment.dto';
import { CreateIncomeEntryDto } from './create-income-entry.dto';
import { Transform, Type } from 'class-transformer';
import { normalizeToMonthStartForTransform } from 'src/common/utils/date.utils';

export class CreateProjectReportDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the project this report belongs to',
  })
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: `ID of the subcontractor for this report. If none is given and there is an existing report for the project, its subcontractor will be used`,
  })
  subcontractorId?: string;

  @IsISO8601()
  @ApiProperty({
    example: '2026-01-10',
    description: 'Date of the project report in ISO-8601 format',
    format: 'ISO-8601',
  })
  @Transform(({ value }: { value: unknown }) =>
    normalizeToMonthStartForTransform(value),
  )
  date!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @ApiPropertyOptional({
    example: 15.5,
    description: `Profit margin percentage for the report. If none is given and a report for the project already exists, its profit margin will be used`,
    minimum: 0,
    maximum: 100,
  })
  profitMargin?: number;

  @IsOptional()
  @IsArray()
  @Type(() => CreateIncomeEntryDto)
  @ValidateNested({ each: true })
  @ApiPropertyOptional({
    description:
      'Income entries for this report. Omitted or empty means a single entry of 0',
    type: [CreateIncomeEntryDto],
  })
  incomeEntries?: CreateIncomeEntryDto[];

  @IsArray()
  @Type(() => CreateSupplierPaymentDto)
  @ValidateNested({ each: true })
  @ApiProperty({
    description:
      'A list of the payments made to suppliers for their work on this project this month',
    type: [CreateSupplierPaymentDto],
  })
  supplierPayments!: CreateSupplierPaymentDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  // The column is DECIMAL(12,2); anything larger is a database error, not a
  // validation error, and surfaces as an opaque 500.
  @Max(9_999_999_999.99)
  @ApiPropertyOptional({
    example: 120000,
    description:
      "Income the project's initiator (יזם) reports for this month. Only meaningful when the project has an initiator, and must be greater than the report's own income; only relevant for PDF export.",
  })
  initiatorIncome?: number;
}
