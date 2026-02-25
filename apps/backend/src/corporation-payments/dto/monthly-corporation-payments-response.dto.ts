import { ApiProperty } from '@nestjs/swagger';
import { NestedCorporationDto } from './nested-corporation.dto';
import { NestedProjectPaymentDto } from './nested-project-payment.dto';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data Transfer Object representing the response for a corporation payments.
 */
export class MonthlyCorporationPaymentsResponseDto {
  @ApiProperty({
    description: 'Information about the corporation receiving the payment',
    type: NestedCorporationDto,
  })
  @Type(() => NestedCorporationDto)
  @ValidateNested()
  corporation!: NestedCorporationDto;

  @ApiProperty({
    description:
      'The project payments associated with this corporation payment',
    type: [NestedProjectPaymentDto],
  })
  @Type(() => NestedProjectPaymentDto)
  @ValidateNested({ each: true })
  @IsArray()
  projectPayments!: NestedProjectPaymentDto[];

  @ApiProperty({
    example: 5000,
    description: 'The total amount paid to the corporation for this payment',
  })
  total!: number;
}
