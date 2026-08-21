import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeToMonthStart } from 'src/common/utils/date.utils';

/**
 * Represents the parameters required to update a subcontractor payment.
 * All fields are optional — provide only the fields to change.
 * Note: amount, subcontractorId, projectId, and serviceDate must all be
 * provided together if any payment amount change is intended.
 */
export class UpdateSubcontractorPaymentDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the subcontractor that the payment belongs to',
  })
  subcontractorId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the project that the payment belongs to',
  })
  projectId?: string;

  @IsOptional()
  @IsISO8601()
  @Transform(({ value }: { value: string }) => normalizeToMonthStart(value))
  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'The date identifying the service month',
  })
  serviceDate?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    example: 1000,
    description: 'The amount of the payment',
  })
  amount?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the payment has been marked as paid',
  })
  isPaid?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({
    example: 'Materials',
    description: 'Short free-text label describing what the payment covers',
    nullable: true,
  })
  tag?: string | null;
}
