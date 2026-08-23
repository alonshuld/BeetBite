import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Data Transfer Object for creating a corporation payment.
 */
export class CreateCorporationPaymentDto {
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
    description: 'Unique identifier for the corporation receiving the payment',
  })
  corporationId!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 5000,
    description: 'The amount paid to the corporation for this project',
  })
  amount!: number;

  @IsISO8601()
  @IsNotEmpty()
  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date the service was provided for this payment',
  })
  date!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Invoice #123',
    description: 'Optional description for this payment',
    required: false,
  })
  description?: string;

  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Whether this payment is for a future service',
  })
  isFuture!: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @ApiProperty({
    example: 18,
    description: 'VAT percentage — only applicable when isFuture is false',
    required: false,
  })
  vatPercentage?: number;
}
