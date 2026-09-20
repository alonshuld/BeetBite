import { ApiProperty } from '@nestjs/swagger';
import { NestedSupplierDto } from './nested-supplier.dto';
import { NestedProjectPaymentDto } from './nested-project-payment.dto';

/**
 * Data Transfer Object representing the response for a supplier payments.
 */
export class MonthlySupplierPaymentsResponseDto {
  @ApiProperty({
    description: 'Information about the supplier receiving the payment',
    type: NestedSupplierDto,
  })
  supplier!: NestedSupplierDto;

  @ApiProperty({
    description: 'The project payments associated with this supplier payment',
    type: [NestedProjectPaymentDto],
  })
  projectPayments!: NestedProjectPaymentDto[];

  @ApiProperty({
    example: 5000,
    description: 'The total amount paid to the supplier for this payment',
  })
  total!: number;

  @ApiProperty({
    example: 12000,
    description:
      'Of that total, how much has actually been paid. The difference is what is still outstanding with this supplier.',
  })
  totalPaid!: number;
}
