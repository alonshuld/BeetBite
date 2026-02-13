import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NestedSubcontractorDto } from './nested-subcontractor.dto';

/**
 * Represents basic subcontractor and subcontractor payment properties nested
 * in project report responses.
 */
export class NestedSubcontractorWithPaymentDto extends NestedSubcontractorDto {
  @ApiProperty({
    example: 10000,
    description:
      'The payment the subcontractor is owed for that project that month',
  })
  payment!: number;

  @ApiPropertyOptional({
    description: 'The exact date the payment has been made (if at all)',
  })
  paymentDate?: string;
}
