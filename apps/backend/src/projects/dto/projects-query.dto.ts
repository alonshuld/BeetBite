import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/pagination-query.dto';

export class ProjectsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiPropertyOptional({
    example: true,
    description:
      'Return active projects (isDone=false AND has at least one report). Default: true.',
    type: Boolean,
    default: true,
  })
  active?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiPropertyOptional({
    example: false,
    description: 'Return future projects (no reports yet). Default: false.',
    type: Boolean,
    default: false,
  })
  future?: boolean = false;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiPropertyOptional({
    example: false,
    description: 'Return closed projects (isDone=true). Default: false.',
    type: Boolean,
    default: false,
  })
  closed?: boolean = false;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter by client ID',
    type: String,
  })
  clientId?: string;
}
