import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { normalizeToMonthStartForTransform } from 'src/common/utils/date.utils';

/**
 * Money a project already brought in before it was entered into the system.
 *
 * A project is often added part-way through the work, so the contractor has
 * already been paid for some of it. There is nowhere to put that amount except
 * a real report, because every financial figure is derived from reports — so
 * this is recorded as a back-dated `ProjectReport` with one income entry.
 *
 * `subcontractorId` and `profitMargin` are required because `ProjectReport`
 * requires both. Making those columns nullable to accommodate a synthetic
 * report would push null handling through every calculation in the app.
 */
export class OpeningBalanceDto {
  @IsNumber()
  @IsPositive()
  @ApiProperty({
    example: 45000,
    description: 'The amount already received for this project',
  })
  amount!: number;

  @IsISO8601()
  @ApiProperty({
    example: '2026-03-01',
    description:
      'The month the amount covers. Normalized to the first of that month, which becomes the back-dated report date.',
  })
  @Transform(({ value }: { value: unknown }) =>
    normalizeToMonthStartForTransform(value),
  )
  month!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      'ID of the subcontractor the back-dated report is attributed to',
  })
  subcontractorId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiProperty({
    example: 15.5,
    description: 'Profit margin percentage for the back-dated report',
    minimum: 0,
    maximum: 100,
  })
  profitMargin!: number;
}
