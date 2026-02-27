import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO represents a nested subcontractor payment, used for embedding in other responses.
 */
export class NestedSubcontractorPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the subcontractor payment',
  })
  id!: string;

  @ApiProperty({
    example: '2026-01-01T00:00:00.000Z',
    description: 'The date identifying the service month',
    format: 'ISO-8601',
  })
  serviceDate!: string;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date the payment was actually processed',
    format: 'ISO-8601',
  })
  paymentDate!: string;

  @ApiProperty({
    example: 156000.0,
    description: 'The amount of the payment in cents',
  })
  amount!: number;
}
