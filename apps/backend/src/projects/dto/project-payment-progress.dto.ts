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

  @ApiProperty({
    example: 60000,
    description:
      'The remaining amount of money the client still has to pay for the project',
  })
  remainingAmount!: number;

  @ApiProperty({
    example: 40,
    description:
      'The percentage of the total estimated amount of money for the project the client already paid',
  })
  percentagePaid!: number;
}
