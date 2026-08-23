import { Prisma } from 'src/generated/client';
import { SubcontractorPaymentsByClientResponseDto } from '../dto/subcontractor-payments-by-client-response.dto';

type PaymentWithClient = {
  amount: Prisma.Decimal;
  project: {
    client: {
      id: string;
      name: string;
    };
  };
};

export const toSubcontractorPaymentsByClientResponseList = (
  payments: PaymentWithClient[],
): SubcontractorPaymentsByClientResponseDto[] => {
  const map = new Map<string, SubcontractorPaymentsByClientResponseDto>();

  for (const payment of payments) {
    const { id, name } = payment.project.client;
    const existing = map.get(id);
    if (existing) {
      existing.totalSubcontractorPayments += payment.amount.toNumber();
    } else {
      map.set(id, {
        clientId: id,
        clientName: name,
        totalSubcontractorPayments: payment.amount.toNumber(),
      });
    }
  }

  return Array.from(map.values());
};
