import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDefined, IsISO8601, ValidateIf } from 'class-validator';
import { normalizeToDayStartForTransform } from 'src/common/utils/date.utils';

/** Marks a month's VAT paid on a day, or unpaid with null. */
export class SetVatPaymentDto {
  @IsDefined()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  @Transform(({ value }: { value: unknown }) =>
    value === null ? null : normalizeToDayStartForTransform(value),
  )
  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-06-03',
    description: 'The day the client paid the VAT; null marks it unpaid',
  })
  vatPaidAt!: string | null;
}
