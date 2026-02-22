import { ApiProperty } from '@nestjs/swagger';
import { CorporationPaymentsResponseDto } from './corporation-payments-response.dto';

/**
 * Data Transfer Object representing the response for monthly corporation payments.
 * This DTO is used to structure the data returned when fetching the total payments made to corporations for a specific month,
 * including the total amount paid and a list of individual corporation payments.
 */
export class MonthlyCorporationPaymentsResponseDto {
  @ApiProperty({
    example: 15000,
    description: 'The total amount paid to all corporations for this month',
  })
  total!: number;

  @ApiProperty({
    description: 'The list of corporation payments for this month',
  })
  corporationPayments!: CorporationPaymentsResponseDto[];
}
