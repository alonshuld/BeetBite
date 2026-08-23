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
  ArrayMinSize,
} from 'class-validator';
import { CreateCorporationPaymentDto } from './create-corporation-payment.dto';
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

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => CreateIncomeEntryDto)
  @ValidateNested({ each: true })
  @ApiProperty({
    description: 'Income entries for this report (at least one required)',
    type: [CreateIncomeEntryDto],
  })
  incomeEntries!: CreateIncomeEntryDto[];

  @IsArray()
  @Type(() => CreateCorporationPaymentDto)
  @ValidateNested({ each: true })
  @ApiProperty({
    description:
      'A list of the payments made to corporations for their work on this project this month',
    type: [CreateCorporationPaymentDto],
  })
  corporationPayments!: CreateCorporationPaymentDto[];
}
