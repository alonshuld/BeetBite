import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, VatRate } from 'src/generated/client';
import { normalizeToMonthStart } from 'src/common/utils/date.utils';
import { UpsertVatRateDto } from './dto/upsert-vat-rate.dto';
import { VatRateResponseDto } from './dto/vat-rate-response.dto';
import { toVatRateResponse } from './mappers/vat-rate.mapper';

/**
 * Service managing the company's VAT rate history. A VAT rate set for a given
 * month carries forward to every later month until a newer entry overrides it —
 * resolving a month always looks up the most recent entry effective on or
 * before that month, so changing a later month's rate never affects earlier ones.
 */
@Injectable()
export class VatRatesService {
  private readonly logger = new Logger(VatRatesService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async upsertForMonth(
    upsertVatRateDto: UpsertVatRateDto,
  ): Promise<VatRateResponseDto> {
    const effectiveMonth = new Date(upsertVatRateDto.month);

    const vatRate = await this.prismaService.vatRate.upsert({
      where: { effectiveMonth },
      create: {
        effectiveMonth,
        percentage: new Prisma.Decimal(upsertVatRateDto.percentage),
      },
      update: {
        percentage: new Prisma.Decimal(upsertVatRateDto.percentage),
      },
    });

    this.logger.log(
      `VAT rate for month ${effectiveMonth.toISOString()} set to ${upsertVatRateDto.percentage}%`,
    );
    return toVatRateResponse(vatRate);
  }

  async findHistory(): Promise<VatRateResponseDto[]> {
    const vatRates = await this.prismaService.vatRate.findMany({
      orderBy: { effectiveMonth: 'desc' },
    });

    return vatRates.map(toVatRateResponse);
  }

  /**
   * Loads the whole rate history, for resolving many months in memory with
   * `resolveVatPercentage` instead of querying once per row.
   */
  async findAllEntries(): Promise<VatRate[]> {
    return this.prismaService.vatRate.findMany({
      orderBy: { effectiveMonth: 'asc' },
    });
  }

  /**
   * Resolves the VAT percentage effective for the given month — the most
   * recently set rate with an effective month on or before it.
   * @param month Any date string within the month to resolve
   * @returns The effective VAT percentage, or `null` if none has ever been configured for that month or earlier
   */
  async resolveForMonth(month: string): Promise<number | null> {
    const monthStart = new Date(normalizeToMonthStart(month));

    const vatRate = await this.prismaService.vatRate.findFirst({
      where: { effectiveMonth: { lte: monthStart } },
      orderBy: { effectiveMonth: 'desc' },
    });

    return vatRate ? vatRate.percentage.toNumber() : null;
  }
}
