import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Data Transfer Object for creating an initiator payment. Documentation only —
 * see T7: never enters any financial calculation.
 */
export class CreateInitiatorPaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'Unique identifier for the project report associated with this payment',
  })
  projectReportId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the initiator receiving the payment',
  })
  initiatorId!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 5000,
    description: 'The amount paid to the initiator for this project',
  })
  amount!: number;

  @IsISO8601()
  @IsOptional()
  @ApiPropertyOptional({
    example: '2026-01-10',
    description: 'The exact date the payment was made to the initiator',
  })
  date?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: 'Consulting fee',
    description: 'Optional description for this payment',
  })
  description?: string;
}
