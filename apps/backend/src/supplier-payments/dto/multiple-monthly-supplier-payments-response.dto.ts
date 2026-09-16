import { ApiProperty } from '@nestjs/swagger';
import { MonthlySupplierPaymentsResponseDto } from './monthly-supplier-payments-response.dto';

/**
 * Data Transfer Object representing the response for multiple supplier payments.
 */
export class MultipleMonthlySupplierPaymentsResponseDto {
  @ApiProperty({
    description: 'List of supplier payments for the specified month',
    type: [MonthlySupplierPaymentsResponseDto],
  })
  suppliersPayments!: MonthlySupplierPaymentsResponseDto[];

  @ApiProperty({
    example: 15000,
    description:
      'The total amount paid to all suppliers for the specified month',
  })
  total!: number;
}
