import { ApiProperty } from '@nestjs/swagger';

export class NestedSubcontractorPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the subcontractor payment',
  })
  id!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the project this payment belongs to',
  })
  projectId!: string;

  @ApiProperty({
    example: 156000.0,
    description: 'The amount of the payment',
  })
  amount!: number;

  @ApiProperty({
    example: false,
    description: 'Whether the payment has been marked as paid',
  })
  isPaid!: boolean;

  @ApiProperty({
    example: 'Materials',
    description: 'Short free-text label describing what the payment covers',
    nullable: true,
  })
  tag!: string | null;
}
