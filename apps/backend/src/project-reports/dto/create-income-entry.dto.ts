import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateIncomeEntryDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 50000,
    description: 'Income amount for this entry',
    minimum: 0,
  })
  amount!: number;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({
    example: '2026-01-15',
    description: 'Date when this income was received (null = not yet received)',
    format: 'ISO-8601',
  })
  incomeDate?: string;
}
