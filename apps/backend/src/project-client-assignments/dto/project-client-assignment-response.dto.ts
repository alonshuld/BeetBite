import { ApiProperty } from '@nestjs/swagger';

/**
 * One entry in a project's ownership timeline.
 */
export class ProjectClientAssignmentResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  projectId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  clientId!: string;

  @ApiProperty({ example: 'Client A' })
  clientName!: string;

  @ApiProperty({
    example: '2026-03-01T00:00:00.000Z',
    description: 'First month this client owns the project',
  })
  effectiveFrom!: string;
}
