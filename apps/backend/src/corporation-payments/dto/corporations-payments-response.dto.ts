import { ApiProperty } from '@nestjs/swagger';
import { CorporationPaymentsResponseDto } from './corporation-payments-response.dto';
import { ValidateNested } from 'class-validator';

/**
 * Data Transfer Object representing the response for multiple corporation payments.
 */
export class CorporationsPaymentsResponseDto {
  @ApiProperty({
    description: 'List of corporation payments for the specified month',
  })
  @ValidateNested({ each: true })
  corporationsPayments!: CorporationPaymentsResponseDto[];

  @ApiProperty({
    example: 15000,
    description:
      'The total amount paid to all corporations for the specified month',
  })
  total!: number;
}
