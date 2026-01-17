import { Injectable, Logger } from '@nestjs/common';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { UpdateSubcontractorPaymentDto } from './dto/update-subcontractor-payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubcontractorPaymentResponseDto } from './dto/subcontractor-payments-repsonse.dto';
import {
  toSubcontractorPaymentResponse,
  toSubcontractorPaymentResponseList,
} from './mappers/subcontractor-payment.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { SubcontractorPaymentAlreadyExistsError } from './errors/subcontractor-payment-already-exists.error';
import { MonthQueryDto } from 'src/common/month-query.dto';

@Injectable()
export class SubcontractorPaymentsService {
  private readonly logger = new Logger(SubcontractorPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Create a new subcontractor payment
   * @param createSubcontractorPaymentDto Parameters for subcontractor payment creation
   * @returns The created subcontractor payment response DTO
   */
  async create(
    createSubcontractorPaymentDto: CreateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    try {
      const subcontractorPayment =
        await this.prismaService.subcontractorPayment.create({
          data: { ...createSubcontractorPaymentDto },
        });

      this.logger.log(
        `Subcontractor payment created: ${subcontractorPayment.id}`,
      );

      return toSubcontractorPaymentResponse(subcontractorPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
            throw new SubcontractorNotFoundError(
              createSubcontractorPaymentDto.subcontractorId,
            );
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SubcontractorPaymentAlreadyExistsError(
              createSubcontractorPaymentDto.subcontractorId,
              createSubcontractorPaymentDto.serviceDate,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Get all of the subcontractor payments from a service month
   * @param monthQueryDto The service month of the payments that will be retrieved
   * @returns List of all of the subcontractor payments from the matching service date
   */
  async findAll(
    monthQueryDto: MonthQueryDto,
  ): Promise<SubcontractorPaymentResponseDto[]> {
    const month = new Date(monthQueryDto.month);

    const subcontractorPayments =
      await this.prismaService.subcontractorPayment.findMany({
        where: { serviceDate: month },
      });

    this.logger.log(
      `Retrieved ${subcontractorPayments.length} subcontractor payments from ${month.toLocaleDateString()}`,
    );

    return toSubcontractorPaymentResponseList(subcontractorPayments);
  }

  findOne(id: number) {
    return `This action returns a #${id} subcontractorPayment`;
  }

  update(
    id: number,
    updateSubcontractorPaymentDto: UpdateSubcontractorPaymentDto,
  ) {
    return `This action updates a #${id} subcontractorPayment`;
  }

  remove(id: number) {
    return `This action removes a #${id} subcontractorPayment`;
  }
}
