import { ApiProperty } from '@nestjs/swagger';

export class SubcontractorPaymentsByClientResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier for the client',
  })
  clientId!: string;

  @ApiProperty({
    example: 'Acme Corp',
    description: 'Name of the client',
  })
  clientName!: string;

  @ApiProperty({
    example: 15000.0,
    description: 'Total subcontractor payments for this client in the month',
  })
  totalSubcontractorPayments!: number;
}
