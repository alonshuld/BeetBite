import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSupplierPaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the supplier the payment was made to',
  })
  supplierId!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 12000,
    description:
      'The amount of money paid to the supplier for the project that month',
  })
  amount!: number;

  @IsISO8601()
  @IsOptional()
  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'The exact date the payment was made to the supplier',
  })
  date?: string;
}
