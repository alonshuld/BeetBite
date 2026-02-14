import { CreateCorporationPaymentDto } from './create-corporation-payment.dto';

/**
 * Data Transfer Object for updating a corporation payment.
 * This DTO extends the CreateCorporationPaymentDto, allowing for the same fields to be used when updating an existing corporation payment.
 * It is used to validate and structure the data required to update a corporation payment, including the associated project report, corporation, payment amount, and service date.
 */
export class UpdateCorporationPaymentDto extends CreateCorporationPaymentDto {}
