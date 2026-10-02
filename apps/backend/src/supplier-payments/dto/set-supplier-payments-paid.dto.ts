import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

/**
 * Marks every one of a supplier's payments in a month as paid or unpaid.
 * A stack of paperwork usually settles as one transfer.
 */
export class SetSupplierPaymentsPaidDto {
  @IsBoolean()
  @ApiProperty({ example: true, description: 'Paid or not' })
  isPaid!: boolean;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({
    example: '2026-01-01',
    description:
      'Month to settle. Omit to apply to every payment of this supplier.',
  })
  month?: string;
}
