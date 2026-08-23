import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { normalizeToMonthStartForTransform } from 'src/common/utils/date.utils';

// Requests a monthly account-approval PDF for one subcontractor's reports under one client.
export class ExportProjectReportsPdfDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Subcontractor whose reports to export',
  })
  subcontractorId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      "Client to scope the export to (the subcontractor's reports for the month may span multiple clients)",
  })
  clientId!: string;

  @IsISO8601()
  @Transform(({ value }: { value: unknown }) =>
    normalizeToMonthStartForTransform(value),
  )
  @ApiProperty({
    example: '2026-03-01T00:00:00.000Z',
    description: 'A date within the month to export',
    type: 'string',
    format: 'ISO-8601',
  })
  month!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @ApiProperty({
    example: 'עבודות שלד + גמר · פרויקט עיר היין, מגרש 309, אשקלון',
    description: 'Free text describing what the account approval covers',
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
