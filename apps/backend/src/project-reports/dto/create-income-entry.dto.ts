import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateIncomeEntryDto {
  // Income is optional: a report can be opened before any amount is agreed
  // for the month. Omitted or null means 0, never a missing value — every
  // figure downstream sums these amounts.
  @Transform(({ value }: { value: unknown }) => value ?? 0)
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({
    example: 50000,
    description: 'Income amount for this entry. Omitted or null means 0',
    minimum: 0,
    default: 0,
  })
  amount: number = 0;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({
    example: '2026-01-15',
    description: 'Date when this income was received (null = not yet received)',
    format: 'ISO-8601',
  })
  incomeDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({
    example: 'שלד',
    description:
      'Short free-text label describing the work this income covers; surfaced as a badge on the account-approval PDF',
    nullable: true,
  })
  tag?: string | null;
}
