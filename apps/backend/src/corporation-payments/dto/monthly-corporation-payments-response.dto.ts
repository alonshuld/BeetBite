import { ApiProperty } from '@nestjs/swagger';
import { CorporationPaymentResponseDto } from './corporation-payment-response.dto';

export class MonthlyCorporationPaymentsResponseDto {
  @ApiProperty({
    example: 15000,
    description: 'The total amount paid to all corporations for this month',
  })
  total!: number;

  @ApiProperty({
    description: 'The list of corporation payments for this month',
  })
  corporationPayments!: CorporationPaymentResponseDto[];
}
