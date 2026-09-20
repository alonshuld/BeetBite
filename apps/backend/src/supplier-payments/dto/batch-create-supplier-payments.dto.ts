import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * One line of a supplier's paperwork — a single payment against one project
 * report.
 */
export class BatchSupplierPaymentRowDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'Project report this payment belongs to. The project must already have a report for the month.',
  })
  projectReportId!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 5000, description: 'Amount owed on this line' })
  amount!: number;

  @IsISO8601()
  @IsNotEmpty()
  @ApiProperty({
    example: '2026-01-10',
    description: 'Date of this line of the paperwork',
  })
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({
    example: 'Invoice #123',
    description: 'What this line covers',
  })
  description?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    example: true,
    default: true,
    description:
      "Whether this line carries VAT, at the global rate for the report's month. Defaults to true.",
  })
  includesVat?: boolean;
}

/**
 * Records a whole stack of one supplier's paperwork in a single submission.
 *
 * The contractor receives everything supplier X is owed for the month across
 * several projects at once, and types it in one sitting. The rows are written
 * all-or-nothing: a half-saved stack with no indication of which half is worse
 * than a clean failure.
 */
export class BatchCreateSupplierPaymentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BatchSupplierPaymentRowDto)
  @ApiProperty({
    type: [BatchSupplierPaymentRowDto],
    description: "The supplier's payment lines for this month",
  })
  payments!: BatchSupplierPaymentRowDto[];
}
