import { ApiProperty } from '@nestjs/swagger';
import { SubcontractorPaymentResponseDto } from './subcontractor-payments-response.dto';

/**
 * DTO represents the response of subcontractor payment
 */
export class MonthlySubcontractorPaymentsPerProjectResponseDto {
  @ApiProperty({
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        subcontractorId: '123e4567-e89b-12d3-a456-426614174000',
        serviceDate: '2026-01-10T00:00:00.000Z',
        paymentDate: '2026-01-15T00:00:00.000Z',
        amount: 156.5,
      },
    ],
    description:
      'List of subcontractor payments for a specific project in a specific month',
  })
  subcontractorPayments!: Array<SubcontractorPaymentResponseDto>;
  @ApiProperty({
    example: 1000,
    description: 'The total target amount for the subcontractor payments',
  })
  targetAmount!: number;
}
