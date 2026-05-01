import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents the payment progress on a project
 */
export class ProjectPaymentProgressDto {
  @ApiProperty({
    example: 40000,
    description:
      'The total amount of money the client already paid for the project',
  })
  totalPaid!: number;
}
