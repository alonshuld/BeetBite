import { ApiProperty } from '@nestjs/swagger';
import { NestedInitiatorDto } from './nested-initiator.dto';

/**
 * Data Transfer Object representing the response for an initiator payment.
 */
export class InitiatorPaymentResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the initiator payment',
  })
  id!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the project report this payment is recorded against',
  })
  projectReportId!: string;

  @ApiProperty({
    description: 'Information about the initiator receiving the payment',
    type: NestedInitiatorDto,
  })
  initiator!: NestedInitiatorDto;

  @ApiProperty({
    example: 5000,
    description: 'The amount paid to the initiator for this payment',
  })
  amount!: number;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date the payment was made',
    nullable: true,
  })
  date!: string | null;

  @ApiProperty({
    example: 'Consulting fee',
    description: 'Optional description for this payment',
    nullable: true,
  })
  description!: string | null;
}
