import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsPositive } from 'class-validator';
import { normalizeToDayStartForTransform } from 'src/common/utils/date.utils';

/** Provide only the fields to change. */
export class UpdateClientPaymentDto {
  @IsOptional()
  @IsPositive()
  @ApiPropertyOptional({
    example: 1000,
    description: 'The amount the client paid',
  })
  amount?: number;

  @IsOptional()
  @IsISO8601()
  @Transform(({ value }: { value: unknown }) =>
    normalizeToDayStartForTransform(value),
  )
  @ApiPropertyOptional({
    example: '2026-01-17',
    description: 'The day the money arrived',
  })
  paymentDate?: string;
}
