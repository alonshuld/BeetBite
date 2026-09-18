import { Prisma } from 'src/generated/client';
import { InitiatorPaymentResponseDto } from '../dto/initiator-payment-response.dto';

type InitiatorPaymentRaw = {
  id: string;
  projectReportId: string;
  amount: Prisma.Decimal;
  date: Date | null;
  description: string | null;
  initiator: { id: string; name: string };
};

/**
 * Converts the given initiator payment entity to an initiator payment response DTO.
 */
export const toInitiatorPaymentResponseDto = (
  payment: InitiatorPaymentRaw,
): InitiatorPaymentResponseDto => ({
  id: payment.id,
  projectReportId: payment.projectReportId,
  initiator: payment.initiator,
  amount: payment.amount.toNumber(),
  date: payment.date?.toISOString() ?? null,
  description: payment.description,
});
