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
 * A documentation-only payment to a project's initiator (יזם), nested inside a
 * project report create/update payload. See T7 — never enters any financial
 * calculation, and deliberately has no isFuture/vatPercentage.
 */
export class CreateInitiatorPaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the initiator the payment was made to',
  })
  initiatorId!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 3000,
    description: 'The amount of money paid to the initiator this month',
  })
  amount!: number;

  @IsISO8601()
  @IsOptional()
  @ApiPropertyOptional({
    example: '2026-01-01',
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
