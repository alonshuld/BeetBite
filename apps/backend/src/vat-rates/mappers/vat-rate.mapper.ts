import { VatRate } from 'src/generated/client';
import { VatRateResponseDto } from '../dto/vat-rate-response.dto';

export const toVatRateResponse = (vatRate: VatRate): VatRateResponseDto => ({
  id: vatRate.id,
  effectiveMonth: vatRate.effectiveMonth.toISOString(),
  percentage: vatRate.percentage.toNumber(),
  createdAt: vatRate.createdAt.toISOString(),
});
