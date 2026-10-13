import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProjectReportDto } from './create-project-report.dto';
import { CreateIncomeEntryDto } from './create-income-entry.dto';
import { CreateSupplierPaymentDto } from './create-supplier-payment.dto';

/**
 * Represents the parameters required to update an existing project report.
 *
 * `incomeEntries` is redeclared (via `OmitType`) because omitting it means
 * something different here than on create: the service only replaces that
 * relation (deleteMany + createMany) when the caller actually sends it, so
 * callers that reconcile income rows through the
 * dedicated per-entry endpoints can omit it here and leave existing rows —
 * ids and tags included — untouched. `supplierPayments` is optional for the
 * same reason: the service replaces the whole list whenever the key is
 * present, so a caller that only edits other fields must be able to leave it
 * out rather than send `[]` and delete every existing payment.
 * `initiatorIncome` is redeclared to also accept `null`, which clears it.
 */
export class UpdateProjectReportDto extends OmitType(CreateProjectReportDto, [
  'incomeEntries',
  'supplierPayments',
  'initiatorIncome',
] as const) {
  // null passes validation (it clears the value); a number gets the same
  // checks as on create.
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9_999_999_999.99)
  @ApiPropertyOptional({
    example: 120000,
    nullable: true,
    type: Number,
    description:
      "Income the project's initiator (יזם) reports for this month. Omit to leave it unchanged, send null to clear it; a number must be greater than the report's own income and needs an initiator on the project.",
  })
  initiatorIncome?: number | null;

  @IsOptional()
  @IsArray()
  @Type(() => CreateIncomeEntryDto)
  @ValidateNested({ each: true })
  @ApiPropertyOptional({
    description:
      'Income entries for this report. Omit to leave existing income rows untouched; when provided, replaces all of them (an empty list means a single entry of 0).',
    type: [CreateIncomeEntryDto],
  })
  incomeEntries?: CreateIncomeEntryDto[];

  @IsOptional()
  @IsArray()
  @Type(() => CreateSupplierPaymentDto)
  @ValidateNested({ each: true })
  @ApiPropertyOptional({
    description:
      'Supplier payments for this report. Omit to leave existing payments untouched; when provided, replaces all of them.',
    type: [CreateSupplierPaymentDto],
  })
  supplierPayments?: CreateSupplierPaymentDto[];
}
