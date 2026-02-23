import { CorporationPaymentsResponseDto } from './corporation-payments-response.dto';

/**
 * Data Transfer Object representing the response for multiple corporation payments.
 */
export class CorporationsPaymentsResponseDto {
  corporationsPayments!: CorporationPaymentsResponseDto[];
  total!: number;
}
