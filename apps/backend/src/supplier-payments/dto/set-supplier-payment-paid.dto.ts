import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Marks a single supplier payment as paid or unpaid. */
export class SetSupplierPaymentPaidDto {
  @IsBoolean()
  @ApiProperty({ example: true, description: 'Paid or not' })
  isPaid!: boolean;
}
