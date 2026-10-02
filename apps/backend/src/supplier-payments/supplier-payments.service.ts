import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { BatchCreateSupplierPaymentsDto } from './dto/batch-create-supplier-payments.dto';
import { SetSupplierPaymentPaidDto } from './dto/set-supplier-payment-paid.dto';
import { SetSupplierPaymentVatDto } from './dto/set-supplier-payment-vat.dto';
import { SetSupplierPaymentsPaidDto } from './dto/set-supplier-payments-paid.dto';
import { MonthlySupplierPaymentsResponseDto } from './dto/monthly-supplier-payments-response.dto';
import { SupplierPaymentNotFoundError } from './errors/supplier-payment-not-found.error';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { SupplierPaymentResponseDto } from './dto/supplier-payment-response.dto';
import {
  toMonthlySupplierPaymentsResponse,
  toMultipleMonthlySuppliersPaymentsResponse,
} from './mappers/monthly-supplier-payments.mapper';
import { toSupplierPaymentResponseDto } from './mappers/supplier-payment.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { SupplierPaymentAlreadyExistsError } from './errors/supplier-payment-already-exists.error';
import { MultipleMonthlySupplierPaymentsResponseDto } from './dto/multiple-monthly-supplier-payments-response.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { ProjectReportNotFoundError } from 'src/project-reports/errors/project-report-not-found.exception';
import { SupplierNotFoundError } from 'src/suppliers/errors/supplier-not-found.error';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';

/**
 * Service responsible for managing supplier payments, including creating, fetching, updating, and deleting payments. It interacts with the database through PrismaService and handles various error scenarios related to supplier payments.
 */
/**
 * Everything `toSupplierPaymentResponseDto` needs. Shared by the single-create,
 * batch-create and paid-toggle paths so they cannot drift apart.
 */
const SUPPLIER_PAYMENT_SELECT = {
  id: true,
  amount: true,
  date: true,
  description: true,
  isFuture: true,
  includesVat: true,
  isPaid: true,
  projectReportId: true,
  supplierId: true,
  projectReport: {
    select: {
      id: true,
      // The month the payment's VAT rate is looked up for.
      date: true,
      projectId: true,
      project: { select: { id: true, name: true } },
    },
  },
  supplier: { select: { id: true, name: true } },
} as const;

@Injectable()
export class SupplierPaymentsService {
  private readonly logger = new Logger(SupplierPaymentsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly vatRatesService: VatRatesService,
  ) {}

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
   * Creates a new supplier payment based on the provided DTO and returns the created payment as a SupplierPaymentResponseDto. Handles potential errors such as foreign key constraints and unique constraint violations.
   * @param createSupplierPaymentDto Supplier payment creation DTO containing the necessary information to create a supplier payment
   * @returns SupplierPaymentResponseDto representing the created supplier payment
   */
  async create(
    createSupplierPaymentDto: CreateSupplierPaymentDto,
  ): Promise<SupplierPaymentResponseDto> {
    try {
      const data = {
        ...createSupplierPaymentDto,
        date: createSupplierPaymentDto.date
          ? new Date(createSupplierPaymentDto.date)
          : null,
        // Not stated means the usual: VAT is charged, unless the payment is
        // not yet invoiced.
        includesVat:
          createSupplierPaymentDto.includesVat ??
          !createSupplierPaymentDto.isFuture,
      };

      const supplierPayment = await this.prismaService.supplierPayment.create({
        data,
        select: SUPPLIER_PAYMENT_SELECT,
      });

      this.logger.log(
        `Created supplier payment with ID: ${supplierPayment.id}`,
      );

      return toSupplierPaymentResponseDto(
        supplierPayment,
        await this.vatRatesService.findAllEntries(),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED: {
            const fieldName = (error.meta?.field_name as string) ?? '';

            if (fieldName.toLowerCase().includes('projectreportid'))
              throw new ProjectReportNotFoundError(
                createSupplierPaymentDto.projectReportId,
              );
            if (fieldName.toLowerCase().includes('supplierid'))
              throw new SupplierNotFoundError(
                createSupplierPaymentDto.supplierId,
              );

            throw new EntityNotFoundError(
              'Could not find either the existing project report or supplier for the given supplier payment',
            );
          }
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SupplierPaymentAlreadyExistsError(
              createSupplierPaymentDto.supplierId,
              createSupplierPaymentDto.date,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Fetches all payments for a specific supplier within a given month. The month is specified in the MonthQueryDto, and the supplier is identified by its ID. Returns a MonthlySupplierPaymentsResponseDto containing the supplier's details and its payments for the specified month. Handles potential errors such as supplier not found.
   * @param supplierId Supplier ID for which to fetch the monthly payments
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns MonthlySupplierPaymentsResponseDto containing the supplier's details and its payments for the specified month
   */
  async findSupplierMonthlyPayments(
    supplierId: string,
    monthQueryDto: MonthQueryDto,
  ): Promise<MonthlySupplierPaymentsResponseDto> {
    const { startDate, endDate } = this.calculateStartAndEndDates(
      monthQueryDto.month,
    );

    const supplier = await this.prismaService.supplier.findUnique({
      where: { id: supplierId },
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
            includesVat: true,
            isFuture: true,
            description: true,
            isPaid: true,
            projectReport: {
              select: {
                id: true,
                date: true,
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

    if (!supplier) {
      throw new SupplierNotFoundError(supplierId);
    }

    this.logger.log(
      `Fetched ${supplier.payments.length} payments for supplier ID: ${supplierId} and month: ${monthQueryDto.month}`,
    );

    return toMonthlySupplierPaymentsResponse(
      supplier,
      await this.vatRatesService.findAllEntries(),
    );
  }

  /**
   * Fetches payments for all suppliers within a given month. The month is specified in the MonthQueryDto. Returns a MultipleMonthlySupplierPaymentsResponseDto containing a list of suppliers, each with their details and payments for the specified month. Handles potential errors such as no suppliers found with payments in the specified month.
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns MultipleMonthlySupplierPaymentsResponseDto containing all supplier payments for the specified month grouped by supplier
   */
  async findSuppliersPaymentsInMonth(
    monthQueryDto: MonthQueryDto,
  ): Promise<MultipleMonthlySupplierPaymentsResponseDto> {
    const { startDate, endDate } = this.calculateStartAndEndDates(
      monthQueryDto.month,
    );

    const suppliers = await this.prismaService.supplier.findMany({
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
            includesVat: true,
            isFuture: true,
            description: true,
            isPaid: true,
            projectReport: {
              select: {
                id: true,
                date: true,
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
      `Fetched payments for ${suppliers.length} suppliers for month: ${monthQueryDto.month}`,
    );

    return toMultipleMonthlySuppliersPaymentsResponse(
      suppliers,
      await this.vatRatesService.findAllEntries(),
    );
  }

  /**
   * Updates an existing supplier payment with the provided ID using the data from the UpdateSupplierPaymentDto. Handles potential errors such as not found, foreign key constraints, and unique constraint violations.
   *
   * An omitted `includesVat` leaves the payment's current choice untouched, so re-saving a payment (e.g. to fix its amount) can never silently switch its VAT back on.
   * @param supplierPaymentId Supplier payment ID of the payment to be updated
   * @param updateSupplierPaymentDto Supplier payment update DTO containing the new data for the supplier payment
   * @returns SupplierPaymentResponseDto representing the updated supplier payment
   */
  async update(
    supplierPaymentId: string,
    updateSupplierPaymentDto: UpdateSupplierPaymentDto,
  ): Promise<SupplierPaymentResponseDto> {
    try {
      const data = {
        ...updateSupplierPaymentDto,
        date: updateSupplierPaymentDto.date
          ? new Date(updateSupplierPaymentDto.date)
          : null,
      };

      const updatedSupplierPayment =
        await this.prismaService.supplierPayment.update({
          where: { id: supplierPaymentId },
          data,
          select: SUPPLIER_PAYMENT_SELECT,
        });

      this.logger.log(`Updated supplier payment with ID: ${supplierPaymentId}`);

      return toSupplierPaymentResponseDto(
        updatedSupplierPayment,
        await this.vatRatesService.findAllEntries(),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new SupplierPaymentNotFoundError(supplierPaymentId);
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED: {
            const fieldName = (error.meta?.field_name as string) ?? '';

            if (fieldName.toLowerCase().includes('projectreportid'))
              throw new ProjectReportNotFoundError(
                updateSupplierPaymentDto.projectReportId,
              );
            if (fieldName.toLowerCase().includes('supplierid'))
              throw new SupplierNotFoundError(
                updateSupplierPaymentDto.supplierId,
              );

            throw new EntityNotFoundError(
              'Could not find either the existing project report or supplier for the given supplier payment',
            );
          }
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SupplierPaymentAlreadyExistsError(
              updateSupplierPaymentDto.supplierId,
              updateSupplierPaymentDto.date,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Removes a supplier payment by its ID
   * @param id ID of the supplier payment to be removed
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.supplierPayment.delete({
        where: { id },
      });

      this.logger.log(`Deleted supplier payment with ID: ${id}`);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new SupplierPaymentNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Records a whole stack of one supplier's paperwork in a single submission.
   *
   * The contractor gets everything supplier X is owed for the month across
   * several projects at once. Rows are written **all-or-nothing**: a stack
   * half-recorded, with nothing to say which half, is worse than a clean
   * failure.
   *
   * Each row says whether it carries VAT (default: it does); the percentage is
   * never stored, so there is nothing to resolve at write time.
   *
   * @param supplierId Supplier the paperwork came from
   * @param dto The payment lines
   * @returns The created payments
   * @throws SupplierNotFoundError, ProjectReportNotFoundError on a bad reference
   */
  async createBatch(
    supplierId: string,
    dto: BatchCreateSupplierPaymentsDto,
  ): Promise<SupplierPaymentResponseDto[]> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!supplier) throw new SupplierNotFoundError(supplierId);

    try {
      const created = await this.prismaService.$transaction(async (tx) =>
        Promise.all(
          dto.payments.map((row) =>
            tx.supplierPayment.create({
              data: {
                supplierId,
                projectReportId: row.projectReportId,
                amount: row.amount,
                date: new Date(row.date),
                description: row.description ?? null,
                includesVat: row.includesVat ?? true,
              },
              select: SUPPLIER_PAYMENT_SELECT,
            }),
          ),
        ),
      );

      this.logger.log(
        `Recorded ${created.length} payments for supplier ${supplierId} in one batch`,
      );
      const vatRates = await this.vatRatesService.findAllEntries();
      return created.map((payment) =>
        toSupplierPaymentResponseDto(payment, vatRates),
      );
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED
      ) {
        // Prisma names the offending column but not the row, and the whole
        // batch has rolled back either way — so report which *kind* of
        // reference was bad rather than inventing a row number.
        const fieldName = (error.meta?.field_name as string) ?? '';
        if (fieldName.toLowerCase().includes('supplierid')) {
          throw new SupplierNotFoundError(supplierId);
        }
        throw new ProjectReportNotFoundError(
          dto.payments.map((payment) => payment.projectReportId).join(', '),
        );
      }
      throw error;
    }
  }

  /**
   * Marks one payment paid or unpaid.
   * @param paymentId Payment to flag
   * @param dto Whether it is paid
   * @returns The updated payment
   * @throws SupplierPaymentNotFoundError when no payment has that id
   */
  async setPaid(
    paymentId: string,
    dto: SetSupplierPaymentPaidDto,
  ): Promise<SupplierPaymentResponseDto> {
    try {
      const updated = await this.prismaService.supplierPayment.update({
        where: { id: paymentId },
        data: { isPaid: dto.isPaid },
        select: SUPPLIER_PAYMENT_SELECT,
      });
      return toSupplierPaymentResponseDto(
        updated,
        await this.vatRatesService.findAllEntries(),
      );
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new SupplierPaymentNotFoundError(paymentId);
      }
      throw error;
    }
  }

  /**
   * Turns VAT on or off for one payment. Only the choice is written — the
   * percentage is the global rate for the payment's report month, read back
   * with the response.
   * @param paymentId Payment to change
   * @param dto Whether the payment carries VAT
   * @returns The updated payment
   * @throws SupplierPaymentNotFoundError when no payment has that id
   */
  async setIncludesVat(
    paymentId: string,
    dto: SetSupplierPaymentVatDto,
  ): Promise<SupplierPaymentResponseDto> {
    try {
      const updated = await this.prismaService.supplierPayment.update({
        where: { id: paymentId },
        data: { includesVat: dto.includesVat },
        select: SUPPLIER_PAYMENT_SELECT,
      });
      return toSupplierPaymentResponseDto(
        updated,
        await this.vatRatesService.findAllEntries(),
      );
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new SupplierPaymentNotFoundError(paymentId);
      }
      throw error;
    }
  }

  /**
   * Marks every one of a supplier's payments in a month paid or unpaid.
   *
   * A stack of paperwork usually settles as one transfer, so ticking twelve
   * rows individually is the wrong shape for the common case.
   *
   * @param supplierId Supplier whose payments to settle
   * @param dto Whether they are paid, and which month
   * @returns How many payments were changed
   */
  async setPaidForSupplier(
    supplierId: string,
    dto: SetSupplierPaymentsPaidDto,
  ): Promise<{ updated: number }> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!supplier) throw new SupplierNotFoundError(supplierId);

    const monthFilter = dto.month
      ? (() => {
          const { startDate, endDate } = this.calculateStartAndEndDates(
            dto.month,
          );
          return { projectReport: { date: { gte: startDate, lte: endDate } } };
        })()
      : {};

    const result = await this.prismaService.supplierPayment.updateMany({
      where: { supplierId, ...monthFilter },
      data: { isPaid: dto.isPaid },
    });

    this.logger.log(
      `Marked ${result.count} payments of supplier ${supplierId} as ${dto.isPaid ? 'paid' : 'unpaid'}`,
    );
    return { updated: result.count };
  }
}
