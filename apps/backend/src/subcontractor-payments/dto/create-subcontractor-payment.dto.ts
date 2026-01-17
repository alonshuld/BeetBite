import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Represents the parameters required to create a new subcontractor payment
 */
export class CreateSubcontractorPaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the subcontractor that the payment belongs to',
  })
  subcontractorId!: string;

  @IsISO8601()
  @IsNotEmpty()
  @ApiProperty({
    example: '2026-01-01',
    description: 'The date identifying the service month',
  })
  serviceDate!: string;

  @IsISO8601()
  @IsOptional()
  @ApiProperty({
    example: '2026-01-01',
    description: 'The date the payment was actually processed',
  })
  paymentDate?: string;
}
