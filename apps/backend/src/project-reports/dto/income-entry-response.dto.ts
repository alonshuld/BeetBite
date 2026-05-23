import { ApiProperty } from '@nestjs/swagger';

export class IncomeEntryResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the income entry',
  })
  id!: string;

  @ApiProperty({
    example: 50000,
    description: 'Income amount for this entry',
  })
  amount!: number;

  @ApiProperty({
    example: '2026-01-15T00:00:00.000Z',
    description:
      'Date when this income was received, or null if not yet received',
    nullable: true,
  })
  incomeDate!: string | null;
}
