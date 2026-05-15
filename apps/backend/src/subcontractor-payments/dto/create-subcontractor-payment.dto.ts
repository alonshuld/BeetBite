import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { normalizeToMonthStart } from 'src/common/utils/date.utils';

export class CreateSubcontractorPaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the subcontractor that the payment belongs to',
  })
  subcontractorId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the project that the payment belongs to',
  })
  projectId!: string;

  @IsISO8601()
  @ApiProperty({
    example: '2026-01-01',
    description: 'The date identifying the service month',
  })
  @Transform(({ value }: { value: string }) => normalizeToMonthStart(value))
  serviceDate!: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    example: 1000,
    description: 'The amount of the payment',
  })
  amount!: number;
}
