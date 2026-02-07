import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO represents the response of subcontractor payment
 */
export class SubcontractorPaymentResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the subcontractor payment',
  })
  id!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the subcontractor that the payment belongs to',
  })
  subcontractorId!: string;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date identifying the service month',
    type: 'string',
    format: 'ISO-8601',
  })
  serviceDate!: string;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date the payment was actually processed',
    type: 'string',
    format: 'ISO-8601',
  })
  paymentDate?: string;
}
