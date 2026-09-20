import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

/**
 * Corrects an existing project-client assignment — typically because the
 * transfer month was entered wrongly.
 */
export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Client this assignment points at',
  })
  clientId?: string;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({
    example: '2026-04-01',
    description:
      'First month this assignment applies to. Normalised to the first of that month.',
  })
  effectiveFrom?: string;
}
