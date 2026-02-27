import { ApiProperty } from '@nestjs/swagger';
import { NestedSubcontractorPaymentDto } from './nested-subcontractor-payment.dto';
import { NestedSubcontractorDto } from './nested-subcontractor.dto';

/**
 * DTO represents the monthly payments for a subcontractor,
 * including the subcontractor details and a list of payments made in that month.
 */
export class MonthlySubcontractorPaymentsDto {
  @ApiProperty({
    description: 'The subcontractor associated with the payments',
    type: NestedSubcontractorDto,
  })
  subcontractor!: NestedSubcontractorDto;

  @ApiProperty({
    description: 'List of subcontractor payments for the month',
    type: [NestedSubcontractorPaymentDto],
  })
  payments!: NestedSubcontractorPaymentDto[];

  @ApiProperty({
    description: 'The total amount paid to the subcontractor for the month',
    example: 5000,
  })
  total!: number;

  @ApiProperty({
    description:
      'The expected total amount to be paid to the subcontractor for the month',
    example: 5000,
  })
  expectedTotal!: number;
}
