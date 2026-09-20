import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInitiatorPaymentDto } from './dto/create-initiator-payment.dto';
import { UpdateInitiatorPaymentDto } from './dto/update-initiator-payment.dto';
import { InitiatorPaymentResponseDto } from './dto/initiator-payment-response.dto';
import { InitiatorPaymentNotFoundError } from './errors/initiator-payment-not-found.error';
import { toInitiatorPaymentResponseDto } from './mappers/initiator-payment.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { ProjectReportNotFoundError } from 'src/project-reports/errors/project-report-not-found.exception';
import { InitiatorNotFoundError } from 'src/initiators/errors/initiator-not-found.error';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

/**
 * Documentation-only payments to a project's initiator (יזם). Never enters any
 * financial calculation.
 */
const INITIATOR_PAYMENT_SELECT = {
  id: true,
  projectReportId: true,
  amount: true,
  date: true,
  description: true,
  initiator: { select: { id: true, name: true } },
} as const;

@Injectable()
export class InitiatorPaymentsService {
  private readonly logger = new Logger(InitiatorPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async create(
    createInitiatorPaymentDto: CreateInitiatorPaymentDto,
  ): Promise<InitiatorPaymentResponseDto> {
    try {
      const payment = await this.prismaService.initiatorPayment.create({
        data: {
          projectReportId: createInitiatorPaymentDto.projectReportId,
          initiatorId: createInitiatorPaymentDto.initiatorId,
          amount: createInitiatorPaymentDto.amount,
          date: createInitiatorPaymentDto.date
            ? new Date(createInitiatorPaymentDto.date)
            : null,
          description: createInitiatorPaymentDto.description ?? null,
        },
        select: INITIATOR_PAYMENT_SELECT,
      });

      this.logger.log(`Created initiator payment with ID: ${payment.id}`);

      return toInitiatorPaymentResponseDto(payment);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED
      ) {
        const fieldName = (error.meta?.field_name as string) ?? '';

        if (fieldName.toLowerCase().includes('projectreportid'))
          throw new ProjectReportNotFoundError(
            createInitiatorPaymentDto.projectReportId,
          );
        if (fieldName.toLowerCase().includes('initiatorid'))
          throw new InitiatorNotFoundError(
            createInitiatorPaymentDto.initiatorId,
          );

        throw new EntityNotFoundError(
          'Could not find either the existing project report or initiator for the given initiator payment',
        );
      }
      throw error;
    }
  }

  async update(
    paymentId: string,
    updateInitiatorPaymentDto: UpdateInitiatorPaymentDto,
  ): Promise<InitiatorPaymentResponseDto> {
    try {
      const payment = await this.prismaService.initiatorPayment.update({
        where: { id: paymentId },
        data: {
          initiatorId: updateInitiatorPaymentDto.initiatorId,
          amount: updateInitiatorPaymentDto.amount,
          date: updateInitiatorPaymentDto.date
            ? new Date(updateInitiatorPaymentDto.date)
            : null,
          description: updateInitiatorPaymentDto.description ?? null,
        },
        select: INITIATOR_PAYMENT_SELECT,
      });

      this.logger.log(`Updated initiator payment with ID: ${paymentId}`);

      return toInitiatorPaymentResponseDto(payment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new InitiatorPaymentNotFoundError(paymentId);
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED: {
            const fieldName = (error.meta?.field_name as string) ?? '';

            if (fieldName.toLowerCase().includes('initiatorid'))
              throw new InitiatorNotFoundError(
                updateInitiatorPaymentDto.initiatorId,
              );

            throw new EntityNotFoundError(
              'Could not find the initiator for the given initiator payment',
            );
          }
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.initiatorPayment.delete({ where: { id } });
      this.logger.log(`Deleted initiator payment with ID: ${id}`);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new InitiatorPaymentNotFoundError(id);
      }
      throw error;
    }
  }
}
