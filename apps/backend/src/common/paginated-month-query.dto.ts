import { IntersectionType } from '@nestjs/swagger';
import { MonthQueryDto } from './month-query.dto';
import { PaginationQueryDto } from './pagination-query.dto';

/**
 * Represents a query to get the paginated resource in a month.
 */
export class PaginatedMonthQueryDto extends IntersectionType(
  MonthQueryDto,
  PaginationQueryDto,
) {}
