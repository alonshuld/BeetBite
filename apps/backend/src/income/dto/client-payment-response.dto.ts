import { ApiProperty } from '@nestjs/swagger';

export class ClientPaymentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() projectReportId!: string;
  @ApiProperty() amount!: number;
  @ApiProperty({ example: '2026-01-17T00:00:00.000Z' })
  paymentDate!: string;
}
