import { ApiProperty } from '@nestjs/swagger';
import { NestedSubcontractorDto } from './nested-subcontractor.dto';

export class SubcontractorPaymentResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the subcontractor payment',
  })
  id!: string;

  @ApiProperty({
    description: 'The subcontractor associated with the payment',
    type: NestedSubcontractorDto,
  })
  subcontractor!: NestedSubcontractorDto;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the project that the payment belongs to',
  })
  projectId!: string;

  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date identifying the service month',
    format: 'ISO-8601',
  })
  serviceDate!: string;

  @ApiProperty({
    example: 156000.0,
    description: 'The amount of the payment in cents',
  })
  amount!: number;

  @ApiProperty({
    example: false,
    description: 'Whether the payment has been marked as paid',
  })
  isPaid!: boolean;

  @ApiProperty({
    example: 'Materials',
    description: 'Short free-text label describing what the payment covers',
    nullable: true,
  })
  tag!: string | null;
}
