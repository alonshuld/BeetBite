import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  Min,
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

  @IsDateString()
  @ApiProperty({
    example: '2024-12-31',
    description: 'Expected finish date of the project',
    type: 'string',
    format: 'date',
  })
  finishDate!: string;
}
