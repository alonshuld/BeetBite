import { ApiProperty } from '@nestjs/swagger';
import { NestedSubcontractorDto } from './nested-subcontractor.dto';

export class NestedSubcontractorWithPaymentDto extends NestedSubcontractorDto {
  @ApiProperty({
    example: 10000,
    description:
      'The payment the subcontractor is owed for that project that month',
  })
  payment!: number;
}
