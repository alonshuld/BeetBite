import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

/***
 * Represents the parameters required to register a new corporation payment.
 */
export class CreateCorporationPaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the corporation the payment was made to',
    type: 'string',
  })
  corporationId!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: '12000',
    description:
      'The amount of money paid to the corporation for the project that month',
    type: 'number',
  })
  amount!: number;

  @IsISO8601()
  @IsNotEmpty()
  @ApiProperty({
    example: '2026-01-01',
    description: 'The exact date the payment was made to the corporation',
  })
  date!: string;
}
