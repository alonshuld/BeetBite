import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601 } from 'class-validator';
import { normalizeToDayStartForTransform } from 'src/common/utils/date.utils';

/** "Paid in full incl. VAT": the client settled everything still open, on one day. */
export class PayInFullDto {
  @IsISO8601()
  @Transform(({ value }: { value: unknown }) =>
    normalizeToDayStartForTransform(value),
  )
  @ApiProperty({
    example: '2026-05-20',
    description: 'The day the money arrived',
  })
  paymentDate!: string;
}
