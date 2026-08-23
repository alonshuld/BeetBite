import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (1-based)',
    type: Number,
    default: 1,
  })
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    example: 10,
    description: 'Items per page',
    type: Number,
    default: 10,
  })
  limit?: number = 10;
}
