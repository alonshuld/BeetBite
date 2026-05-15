import { ApiProperty } from '@nestjs/swagger';

export class NestedSubcontractorPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the subcontractor payment',
  })
  id!: string;

  @ApiProperty({
    example: 156000.0,
    description: 'The amount of the payment',
  })
  amount!: number;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date the payment was actually processed',
    format: 'ISO-8601',
    nullable: true,
  })
  paymentDate!: string | null;
}
