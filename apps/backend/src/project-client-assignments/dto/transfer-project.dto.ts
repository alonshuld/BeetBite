import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

/**
 * Transfers a project to a different client, effective from a given month.
 *
 * The project keeps its whole history: months before `effectiveFrom` stay with
 * whichever client owned them, and months from `effectiveFrom` onward belong to
 * `clientId`.
 */
export class TransferProjectDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Client the project moves to',
  })
  clientId!: string;

  @IsISO8601()
  @IsNotEmpty()
  @ApiProperty({
    example: '2026-03-01',
    description:
      'First month the new client owns the project. Normalised to the first of that month.',
  })
  effectiveFrom!: string;
}
