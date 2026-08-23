import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Requests the account-approval PDF for one project report.
 *
 * A report is already unique per project and month (`@@unique([projectId, date])`),
 * so its id is the only scope the document needs — the rows of the rendered
 * table are that report's own income entries.
 */
export class ExportProjectReportsPdfDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Project report to render',
  })
  projectReportId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @ApiProperty({
    example: 'עבודות שלד + גמר',
    description:
      'Free text describing what the account approval covers; the project name is appended to it on the document',
  })
  approvedFor!: string;

  @IsOptional()
  @IsIn(['en', 'he'])
  @ApiPropertyOptional({
    example: 'he',
    description: 'Language/direction of the rendered PDF',
    default: 'he',
  })
  lang?: 'en' | 'he';
}
