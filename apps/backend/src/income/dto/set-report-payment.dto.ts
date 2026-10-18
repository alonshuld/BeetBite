import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, ValidateIf } from 'class-validator';
import { normalizeToDayStartForTransform } from 'src/common/utils/date.utils';

/**
 * Marks a month's income and/or its VAT as paid on a date, or unpaid with
 * null. A field left out is left as it is, so "paid in full including VAT"
 * sends both and a single checkmark sends one.
 */
export class SetReportPaymentDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  @Transform(({ value }: { value: unknown }) =>
    value === null ? null : normalizeToDayStartForTransform(value),
  )
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '2026-05-12',
    description:
      'The day the client paid the income (excl. VAT); null marks it unpaid',
  })
  incomePaidAt?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  @Transform(({ value }: { value: unknown }) =>
    value === null ? null : normalizeToDayStartForTransform(value),
  )
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '2026-06-03',
    description: 'The day the client paid the VAT; null marks it unpaid',
  })
  vatPaidAt?: string | null;
}
