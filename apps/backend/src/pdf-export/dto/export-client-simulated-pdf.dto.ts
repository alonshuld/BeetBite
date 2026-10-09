import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MarginOverrideDto } from './margin-override.dto';

/**
 * Requests the client-wide simulated PDF — all of a client's reports for
 * one month as the Reports screen's project sheets, rendered as if the simulated margins were the real
 * ones. The override map is transient: applied at render time only, never
 * written back to any ProjectReport.
 */
export class ExportClientSimulatedPdfDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Client whose reports for the month are exported',
  })
  clientId!: string;

  @IsISO8601()
  @ApiProperty({
    example: '2026-01-01',
    description: 'Month to export, any date within it',
  })
  month!: string;

  @IsArray()
  @Type(() => MarginOverrideDto)
  @ValidateNested({ each: true })
  @ApiProperty({
    description:
      "Simulated profit margin per project. A project not listed here renders at its report's stored margin.",
    type: [MarginOverrideDto],
  })
  overrides!: MarginOverrideDto[];

  @IsOptional()
  @IsIn(['en', 'he'])
  @ApiPropertyOptional({
    example: 'he',
    description: 'Language/direction of the rendered PDF',
    default: 'he',
  })
  lang?: 'en' | 'he';
}
