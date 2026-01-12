import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class MonthQueryDto {
  @IsISO8601()
  @ApiProperty({
    example: '2024-06-15T00:00:00.000Z',
    description: 'A date within the month to query, in ISO-8601 format',
    type: 'string',
    format: 'ISO-8601',
  })
  month!: string;
}
