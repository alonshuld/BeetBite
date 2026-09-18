import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

/**
 * One project's simulated profit margin for the client-wide export (T6).
 * Never persisted — applied at render time only.
 */
export class MarginOverrideDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Project this override applies to',
  })
  projectId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiProperty({
    example: 12.5,
    description: 'Simulated profit margin percentage for this project',
    minimum: 0,
    maximum: 100,
  })
  margin!: number;
}
