import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsOptional,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OpeningBalanceDto } from './opening-balance.dto';

/**
 * Represents the parameters required to create a new project.
 */
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the client that owns this project',
    type: 'string',
  })
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Office Building Renovation',
    description: 'Name of the project',
    type: 'string',
  })
  name!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty({
    example: 150000.5,
    description: 'Estimated amount for the project',
    type: 'number',
  })
  estimatedAmount!: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'Renovation of the office building located at 123 Main St.',
    description: 'A description of the project',
    type: 'string',
  })
  description!: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Whether the project is closed/done',
    type: 'boolean',
    required: false,
    default: false,
  })
  isDone?: boolean;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    example: 'Jane Doe',
    description:
      'Name of the person who commissioned this specific project (may differ from the client); printed on the account-approval PDF in place of the client name',
    type: 'string',
  })
  requesterName!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @ApiProperty({
    example: '123 Main St, Tel Aviv',
    description: 'Location of the project',
    type: 'string',
  })
  location!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description:
      "Optional ID of the project's initiator (יזם), if one exists. Unlike clientId, this is nullable — most projects have no initiator at all.",
    nullable: true,
  })
  initiatorId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => OpeningBalanceDto)
  @ApiPropertyOptional({
    description:
      'Money already received for this project before it was entered. Creates one back-dated report alongside the project, in the same transaction. Omit it and only the project is created.',
    type: OpeningBalanceDto,
  })
  openingBalance?: OpeningBalanceDto;
}
