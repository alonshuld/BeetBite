import { ApiProperty } from '@nestjs/swagger';
import { MonthlyCorporationPaymentsResponseDto } from './monthly-corporation-payments-response.dto';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data Transfer Object representing the response for multiple corporation payments.
 */
export class MultipleMonthlyCorporationPaymentsResponseDto {
  @ApiProperty({
    description: 'List of corporation payments for the specified month',
    type: [MonthlyCorporationPaymentsResponseDto],
  })
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => MonthlyCorporationPaymentsResponseDto)
  corporationsPayments!: MonthlyCorporationPaymentsResponseDto[];

  @ApiProperty({
    example: 15000,
    description:
      'The total amount paid to all corporations for the specified month',
  })
  total!: number;
}
