import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCorporationPaymentDto } from './dto/create-corporation-payment.dto';
import { MonthlyCorporationPaymentsResponseDto } from './dto/monthly-corporation-payments-response.dto';
import { CorporationPaymentNotFoundError } from './errors/corporation-payment-not-found.error';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { CorporationPaymentResponseDto } from './dto/corporation-payment-response.dto';
import {
  toMonthlyCorporationPaymentsResponse,
  toMultipleMonthlyCorporationsPaymentsResponse,
} from './mappers/monthly-corporation-payments.mapper';
import { toCorporationPaymentResponseDto } from './mappers/corporation-payment.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { CorporationPaymentAlreadyExistsError } from './errors/corporation-payment-already-exists.error';
import { MultipleMonthlyCorporationPaymentsResponseDto } from './dto/multiple-monthly-corporation-payments-response.dto';
import { UpdateCorporationPaymentDto } from './dto/update-corporation-payment.dto';
import { ProjectReportNotFoundError } from 'src/project-reports/errors/project-report-not-found.exception';
import { CorporationNotFoundError } from 'src/corporations/errors/corporation-not-found.error';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

/**
 * Service responsible for managing corporation payments, including creating, fetching, updating, and deleting payments. It interacts with the database through PrismaService and handles various error scenarios related to corporation payments.
 */
@Injectable()
export class CorporationPaymentsService {
  private readonly logger = new Logger(CorporationPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Calculates the start and end dates for a given month string in the format 'YYYY-MM'. The start date is set to the first day of the month, and the end date is set to the last day of the month.
   * @param month Month string in the format 'YYYY-MM' for which to calculate the start and end dates
   * @returns Start and end dates for the specified month
   */
  private calculateStartAndEndDates(month: string): {
    startDate: Date;
    endDate: Date;
  } {
    const ref = new Date(month);
    const startDate = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1),
    );
    const endDate = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0),
    );
    return { startDate, endDate };
  }

  /**
   * Creates a new corporation payment based on the provided DTO and returns the created payment as a CorporationPaymentResponseDto. Handles potential errors such as foreign key constraints and unique constraint violations.
   * @param createCorporationPaymentDto Corporation payment creation DTO containing the necessary information to create a corporation payment
   * @returns CorporationPaymentResponseDto representing the created corporation payment
   */
  async create(
    createCorporationPaymentDto: CreateCorporationPaymentDto,
  ): Promise<CorporationPaymentResponseDto> {
    try {
      const data = {
        ...createCorporationPaymentDto,
        date: createCorporationPaymentDto.date
          ? new Date(createCorporationPaymentDto.date)
          : null,
        vatPercentage:
          !createCorporationPaymentDto.isFuture &&
          createCorporationPaymentDto.vatPercentage === undefined
            ? 18
            : createCorporationPaymentDto.vatPercentage,
      };

      const corporationPayment =
        await this.prismaService.corporationPayment.create({
          data,
          select: {
            id: true,
            amount: true,
            date: true,
            description: true,
            isFuture: true,
            vatPercentage: true,
            projectReportId: true,
            corporationId: true,
            projectReport: {
              select: {
                id: true,
                projectId: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            corporation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

      this.logger.log(
        `Created corporation payment with ID: ${corporationPayment.id}`,
      );

      return toCorporationPaymentResponseDto(corporationPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED: {
            const fieldName = (error.meta?.field_name as string) ?? '';

            if (fieldName.toLowerCase().includes('projectreportid'))
              throw new ProjectReportNotFoundError(
                createCorporationPaymentDto.projectReportId,
              );
            if (fieldName.toLowerCase().includes('corporationid'))
              throw new CorporationNotFoundError(
                createCorporationPaymentDto.corporationId,
              );

            throw new EntityNotFoundError(
              'Could not find either the existing project report or corporation for the given corporation payment',
            );
          }
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new CorporationPaymentAlreadyExistsError(
              createCorporationPaymentDto.corporationId,
              createCorporationPaymentDto.date,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Fetches all payments for a specific corporation within a given month. The month is specified in the MonthQueryDto, and the corporation is identified by its ID. Returns a MonthlyCorporationPaymentsResponseDto containing the corporation's details and its payments for the specified month. Handles potential errors such as corporation not found.
   * @param corporationId Corporation ID for which to fetch the monthly payments
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns MonthlyCorporationPaymentsResponseDto containing the corporation's details and its payments for the specified month
   */
  async findCorporationMonthlyPayments(
    corporationId: string,
    monthQueryDto: MonthQueryDto,
  ): Promise<MonthlyCorporationPaymentsResponseDto> {
    const { startDate, endDate } = this.calculateStartAndEndDates(
      monthQueryDto.month,
    );

    const corporation = await this.prismaService.corporation.findUnique({
      where: { id: corporationId },
      select: {
        id: true,
        name: true,
        payments: {
          where: {
            projectReport: { date: { gte: startDate, lte: endDate } },
          },
          select: {
            id: true,
            amount: true,
            date: true,
            vatPercentage: true,
            isFuture: true,
            description: true,
            projectReport: {
              select: {
                id: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!corporation) {
      throw new CorporationNotFoundError(corporationId);
    }

    this.logger.log(
      `Fetched ${corporation.payments.length} payments for corporation ID: ${corporationId} and month: ${monthQueryDto.month}`,
    );

    return toMonthlyCorporationPaymentsResponse(corporation);
  }

  /**
   * Fetches payments for all corporations within a given month. The month is specified in the MonthQueryDto. Returns a MultipleMonthlyCorporationPaymentsResponseDto containing a list of corporations, each with their details and payments for the specified month. Handles potential errors such as no corporations found with payments in the specified month.
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns MultipleMonthlyCorporationPaymentsResponseDto containing all corporation payments for the specified month grouped by corporation
   */
  async findCorporationsPaymentsInMonth(
    monthQueryDto: MonthQueryDto,
  ): Promise<MultipleMonthlyCorporationPaymentsResponseDto> {
    const { startDate, endDate } = this.calculateStartAndEndDates(
      monthQueryDto.month,
    );

    const corporations = await this.prismaService.corporation.findMany({
      where: {
        payments: {
          some: {
            projectReport: { date: { gte: startDate, lte: endDate } },
          },
        },
      },
      select: {
        id: true,
        name: true,
        payments: {
          where: {
            projectReport: { date: { gte: startDate, lte: endDate } },
          },
          select: {
            id: true,
            amount: true,
            date: true,
            vatPercentage: true,
            isFuture: true,
            description: true,
            projectReport: {
              select: {
                id: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Fetched payments for ${corporations.length} corporations for month: ${monthQueryDto.month}`,
    );

    return toMultipleMonthlyCorporationsPaymentsResponse(corporations);
  }

  /**
   * Updates an existing corporation payment with the provided ID using the data from the UpdateCorporationPaymentDto. Handles potential errors such as not found, foreign key constraints, and unique constraint violations.
   * @param corporationPaymentId Corporation payment ID of the payment to be updated
   * @param updateCorporationPaymentDto Corporation payment update DTO containing the new data for the corporation payment
   * @returns CorporationPaymentResponseDto representing the updated corporation payment
   */
  async update(
    corporationPaymentId: string,
    updateCorporationPaymentDto: UpdateCorporationPaymentDto,
  ): Promise<CorporationPaymentResponseDto> {
    try {
      const data = {
        ...updateCorporationPaymentDto,
        date: updateCorporationPaymentDto.date
          ? new Date(updateCorporationPaymentDto.date)
          : null,
        vatPercentage:
          !updateCorporationPaymentDto.isFuture &&
          updateCorporationPaymentDto.vatPercentage === undefined
            ? 18
            : updateCorporationPaymentDto.vatPercentage,
      };

      const updatedCorporationPayment =
        await this.prismaService.corporationPayment.update({
          where: { id: corporationPaymentId },
          data,
          select: {
            id: true,
            amount: true,
            date: true,
            description: true,
            isFuture: true,
            vatPercentage: true,
            projectReportId: true,
            corporationId: true,
            projectReport: {
              select: {
                id: true,
                projectId: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            corporation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

      this.logger.log(
        `Updated corporation payment with ID: ${corporationPaymentId}`,
      );

      return toCorporationPaymentResponseDto(updatedCorporationPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new CorporationPaymentNotFoundError(corporationPaymentId);
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED: {
            const fieldName = (error.meta?.field_name as string) ?? '';

            if (fieldName.toLowerCase().includes('projectreportid'))
              throw new ProjectReportNotFoundError(
                updateCorporationPaymentDto.projectReportId,
              );
            if (fieldName.toLowerCase().includes('corporationid'))
              throw new CorporationNotFoundError(
                updateCorporationPaymentDto.corporationId,
              );

            throw new EntityNotFoundError(
              'Could not find either the existing project report or corporation for the given corporation payment',
            );
          }
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new CorporationPaymentAlreadyExistsError(
              updateCorporationPaymentDto.corporationId,
              updateCorporationPaymentDto.date,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Removes a corporation payment by its ID
   * @param id ID of the corporation payment to be removed
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.corporationPayment.delete({
        where: { id },
      });

      this.logger.log(`Deleted corporation payment with ID: ${id}`);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new CorporationPaymentNotFoundError(id);
      }
      throw error;
    }
  }
}
