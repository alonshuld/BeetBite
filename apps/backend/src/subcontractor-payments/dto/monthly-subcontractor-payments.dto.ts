import { ApiProperty } from '@nestjs/swagger';
import { NestedSubcontractorPaymentDto } from './nested-subcontractor-payment.dto';
import { NestedSubcontractorDto } from './nested-subcontractor.dto';

export class MonthlySubcontractorPaymentsDto {
  @ApiProperty({
    description: 'The subcontractor associated with the payments',
    type: NestedSubcontractorDto,
  })
  subcontractor!: NestedSubcontractorDto;

  @ApiProperty({
    description: 'The service month start date',
    example: '2026-01-01T00:00:00.000Z',
  })
  serviceDate!: string;

  @ApiProperty({
    description: 'The total amount owed to the subcontractor for the month',
    example: 5000,
  })
  amountOwed!: number;

  @ApiProperty({
    description: 'The total amount paid to the subcontractor for the month',
    example: 3000,
  })
  amountPaid!: number;

  @ApiProperty({
    description: 'List of payments made to the subcontractor for the month',
    type: [NestedSubcontractorPaymentDto],
  })
  payments!: NestedSubcontractorPaymentDto[];
}
