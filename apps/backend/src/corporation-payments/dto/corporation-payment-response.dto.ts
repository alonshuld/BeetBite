import { ApiProperty } from '@nestjs/swagger';
import { NestedCorporationDto } from './nested-corporation.dto';
import { NestedProjectPaymentDto } from './nested-project-payment.dto';

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
