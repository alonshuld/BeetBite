import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateIncomeEntryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({
    example: 50000,
    description: 'Updated income amount',
    minimum: 0,
  })
  amount?: number;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({
    example: '2026-01-15',
    description: 'Updated income date (null to mark as not yet received)',
    nullable: true,
  })
  incomeDate?: string | null;
}
