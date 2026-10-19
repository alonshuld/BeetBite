import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { normalizeToDayStartForTransform } from 'src/common/utils/date.utils';

export class CreateClientPaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'ID of the project report (project + month) the payment settles',
  })
  projectReportId!: string;

  @IsPositive()
  @ApiProperty({
    example: 1000,
    description: 'The amount the client paid towards the income (excl. VAT)',
  })
  amount!: number;

  @IsISO8601()
  @Transform(({ value }: { value: unknown }) =>
    normalizeToDayStartForTransform(value),
  )
  @ApiProperty({
    example: '2026-01-17',
    description: 'The day the money arrived',
  })
  paymentDate!: string;
}
