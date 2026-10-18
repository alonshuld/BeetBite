import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetIncomeVatDto {
  @IsBoolean()
  @ApiProperty({
    example: true,
    description: "Whether the client pays VAT on top of this month's income",
  })
  incomeIncludesVat!: boolean;
}
