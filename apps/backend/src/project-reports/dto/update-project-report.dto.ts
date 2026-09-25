import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProjectReportDto } from './create-project-report.dto';
import { CreateIncomeEntryDto } from './create-income-entry.dto';
import { CreateSupplierPaymentDto } from './create-supplier-payment.dto';

/**
 * Represents the parameters required to update an existing project report.
 *
 * `incomeEntries` is the one field made optional relative to
 * `CreateProjectReportDto` (via `OmitType`, so its required declaration on
 * the base class does not conflict with the optional one here): the service
 * only replaces that relation (deleteMany + createMany) when the caller
 * actually sends it, so callers that reconcile income rows through the
 * dedicated per-entry endpoints can omit it here and leave existing rows —
 * ids and tags included — untouched. `supplierPayments` is optional for the
 * same reason: the service replaces the whole list whenever the key is
 * present, so a caller that only edits other fields must be able to leave it
 * out rather than send `[]` and delete every existing payment.
 */
export class UpdateProjectReportDto extends OmitType(CreateProjectReportDto, [
  'incomeEntries',
  'supplierPayments',
] as const) {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => CreateIncomeEntryDto)
  @ValidateNested({ each: true })
  @ApiPropertyOptional({
    description:
      'Income entries for this report. Omit to leave existing income rows untouched; when provided, replaces all of them (at least one required).',
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
