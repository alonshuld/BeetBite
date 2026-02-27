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
import { CreateCorporationPaymentDto } from './create-corporation-payment.dto';
import { Transform, Type } from 'class-transformer';
import { normalizeToMonthStart } from 'src/common/utils/date.utils';

/**
 * Represents the parameters required to create a new project report.
 */
export class CreateProjectReportDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the project this report belongs to',
    type: 'string',
  })
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: `
ID of the subcontractor for this report. If none is given and there is an existing report for the
project, its subcontractor will be used
`,
    type: 'string',
  })
  subcontractorId?: string;

  @IsISO8601()
  @ApiProperty({
    example: '2026-01-10',
    description: 'Date of the project report in ISO-8601 format',
    type: 'string',
    format: 'ISO-8601',
  })
  @Transform(({ value }: { value: string }) => normalizeToMonthStart(value))
  date!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @ApiPropertyOptional({
    example: 15.5,
    description: `
Profit margin percentage for the report. If none is given and a report for the project already
exists, its profit margin will be used
`,
    type: 'number',
    minimum: 0,
    maximum: 100,
  })
  profitMargin?: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 50000,
    description: 'Income amount for the report',
    type: 'number',
    minimum: 0,
  })
  income!: number;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({
    example: '2026-01-15',
    description:
      'Date when income was received (if it was received yet at all)',
    type: 'string',
    format: 'ISO-8601',
  })
  incomeDate?: string;

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
