import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601 } from 'class-validator';
import { normalizeToMonthStart } from './utils/date.utils';

/**
 * Represents a month by which to query the system.
 */
export class MonthQueryDto {
  @IsISO8601()
  @Transform(({ value }: { value: string }) => normalizeToMonthStart(value))
  @ApiProperty({
    example: '2024-06-15T00:00:00.000Z',
    description: 'A date within the month to query, in ISO-8601 format',
    type: 'string',
    format: 'ISO-8601',
  })
  month!: string;
}
