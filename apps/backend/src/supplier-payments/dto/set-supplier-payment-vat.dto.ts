import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Turns VAT on or off for a single supplier payment. */
export class SetSupplierPaymentVatDto {
  @IsBoolean()
  @ApiProperty({
    example: true,
    description:
      "Whether the payment carries VAT, at the global rate for its report's month",
  })
  includesVat!: boolean;
}
