import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsISO8601,
} from 'class-validator';

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
  @Min(0)
  @ApiProperty({
    example: 150000.5,
    description: 'Estimated amount for the project',
    type: 'number',
  })
  estimatedAmount!: number;

  @IsISO8601()
  @ApiProperty({
    example: '2026-01-10T00:00:00.000Z',
    description: 'Expected finish date of the project in the ISO-8601 format',
    type: 'string',
    format: 'ISO-8601',
  })
  finishDate!: string;

  @ApiProperty({
    example: 'Renovation of the office building located at 123 Main St.',
    description: 'A description of the project',
    type: 'string',
  })
  description!: string;
}
