import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MonthQueryDto } from './month-query.dto';
import { PaginationQueryDto } from './pagination-query.dto';

/**
 * Represents a query to get the paginated resource in a month.
 */
export class PaginatedMonthQueryDto {
  @ApiPropertyOptional({
    description: 'The pagination parameters for retrieving the resource',
  })
  paginationQuery?: PaginationQueryDto;

  @ApiProperty({
    description: 'The month by which to query',
  })
  monthQuery!: MonthQueryDto;
}
