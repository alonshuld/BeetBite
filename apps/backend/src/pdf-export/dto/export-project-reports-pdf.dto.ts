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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({
    example: 'ישראל ישראלי',
    description:
      'Name of the person or company this project report is for; the project name is appended to it on the document. Omit or leave empty to print the project name alone.',
  })
  approvedFor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @ApiPropertyOptional({
    example: 'עבודות שלד + גמר',
    description:
      "Description printed on this document only. It is never written back to the project — the project's own description is edited from the projects screen.",
  })
  description?: string;

  @IsOptional()
  @IsIn(['en', 'he'])
  @ApiPropertyOptional({
    example: 'he',
    description: 'Language/direction of the rendered PDF',
    default: 'he',
  })
  lang?: 'en' | 'he';
}
