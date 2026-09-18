import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NestedInitiatorDto } from './nested-initiator.dto';

/**
 * Represents an initiator payment nested in project report responses.
 * Documentation only — see T7.
 */
export class NestedInitiatorPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the initiator payment',
  })
  id!: string;

  @ApiProperty({
    description: 'Information on the initiator',
    type: NestedInitiatorDto,
  })
  initiator!: NestedInitiatorDto;

  @ApiProperty({
    example: 3000,
    description: 'The amount of money paid to the initiator',
  })
  amount!: number;

  @ApiPropertyOptional({
    example: '2026-01-10T00:00:00.000Z',
    description: 'The date the payment was made',
    nullable: true,
  })
  date?: string | null;

  @ApiPropertyOptional({
    example: 'Consulting fee',
    description: 'Optional description for this payment',
    nullable: true,
  })
  description?: string | null;
}
