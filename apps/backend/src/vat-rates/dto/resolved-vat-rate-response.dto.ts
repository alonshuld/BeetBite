import { ApiProperty } from '@nestjs/swagger';

export class ResolvedVatRateResponseDto {
  @ApiProperty({
    example: 18,
    description:
      'VAT percentage effective for the queried month, or null if no VAT rate has ever been configured for that month or earlier',
    nullable: true,
  })
  percentage!: number | null;
}
