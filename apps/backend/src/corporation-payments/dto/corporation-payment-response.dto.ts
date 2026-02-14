import { ApiProperty } from '@nestjs/swagger';
import { NestedCorporationDto } from './nested-corporation.dto';
import { NestedProjectPaymentDto } from './nested-project-payment.dto';

/**
 * Data Transfer Object representing the response for a corporation payment.
 * This DTO is used to structure the data returned when fetching corporation payment details,
 * including information about the corporation, the associated project payment,
 * and the total amount paid.
 */
export class CorporationPaymentResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the corporation payment',
  })
  id!: string;

  @ApiProperty({
    description: 'Information about the corporation receiving the payment',
  })
  corporation!: NestedCorporationDto;

  @ApiProperty({
    description: 'The project payment associated with this corporation payment',
  })
  projectPayment!: NestedProjectPaymentDto;

  @ApiProperty({
    example: 5000,
    description: 'The total amount paid to the corporation for this payment',
  })
  total!: number;
}
