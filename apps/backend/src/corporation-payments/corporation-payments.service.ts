import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCorporationPaymentDto } from './dto/create-corporation-payment.dto';
import { CorporationPaymentResponseDto } from './dto/corporation-payment-response.dto';
import { CorporationPaymentNotFoundError } from './errors/corporation-payment-not-found.dto';

@Injectable()
export class CorporationPaymentsService {
  private readonly logger = new Logger(CorporationPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private async getCorporationPaymentNestedFields(corporationPaymentId: string) {
    return this.prismaService.corporationPayment.findUnique({
      where: { id: corporationPaymentId },
      include: {
        corporation: {
          select: {
            id: true,
            name: true,
          }
        },
        projectReport: {
          select: {
            id: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            }
          },
        },
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

      const fullCorporationPayment = await this.getCorporationPaymentNestedFields(corporationPayment.id);
      if (!fullCorporationPayment) {
        throw new CorporationPaymentNotFoundError(corporationPayment.id);
      }
    }
  }
}
