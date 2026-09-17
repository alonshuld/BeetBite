import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsOptional,
  MaxLength,
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
}
