import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsNumber, Max, Min } from 'class-validator';
import { normalizeToMonthStartForTransform } from 'src/common/utils/date.utils';

// Sets (or overrides) the VAT percentage effective from a given month onward.
export class UpsertVatRateDto {
  @IsISO8601()
  @Transform(({ value }: { value: unknown }) =>
    normalizeToMonthStartForTransform(value),
  )
  @ApiProperty({
    example: '2026-04-01T00:00:00.000Z',
    description: 'A date within the month the VAT rate becomes effective from',
    type: 'string',
    format: 'ISO-8601',
  })
  month!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiProperty({
    example: 18,
    description: 'VAT percentage effective from the given month onward',
  })
  percentage!: number;
}
