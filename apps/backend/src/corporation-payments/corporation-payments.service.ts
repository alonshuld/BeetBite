import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCorporationPaymentDto } from './dto/create-corporation-payment.dto';
import { CorporationPaymentsResponseDto } from './dto/corporation-payments-response.dto';
import { CorporationPaymentNotFoundError } from './errors/corporation-payment-not-found.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { CorporationPaymentResponseDto } from './dto/corporation-payment-response.dto';

@Injectable()
export class CorporationPaymentsService {
  private readonly logger = new Logger(CorporationPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private async getMonthlyCorporationPaymentsFields(corporationId: string, date: MonthQueryDto) {
    const startOfMonth = new Date(date.month);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(startOfMonth.getMonth() + 1);

    return this.prismaService.corporation.findUnique({
      where: { id: corporationId },
      include: {
        payments: {
          where: {
            date: {
              gte: startOfMonth,
              lt: endOfMonth,
            },
          },
          include: {
            projectReport: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });
  }

  private getCorporationPaymentResponse(corporationPaymentId: string) {
    return this.prismaService.corporationPayment.findUnique({
      where: { id: corporationPaymentId },
      include: {
        projectReport: true,
        corporation: true,
      },
    });
  }

  async create(
    createCorporationPaymentDto: CreateCorporationPaymentDto,
  ): Promise<CorporationPaymentResponseDto> {
    try {
      const corporationPayment =
        await this.prismaService.corporationPayment.create({
          data: {...createCorporationPaymentDto},
        });

      this.logger.log(
        `Created corporation payment with ID: ${corporationPayment.id}`,
      )


  }
}
