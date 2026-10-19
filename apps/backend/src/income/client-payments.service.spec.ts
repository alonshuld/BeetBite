import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { ProjectReportNotFoundError } from 'src/project-reports/errors/project-report-not-found.exception';
import { ClientPaymentsService } from './client-payments.service';
import { ClientPaymentNotFoundError } from './errors/client-payment-not-found.error';
import { ClientPaymentOverpaymentError } from './errors/client-payment-overpayment.error';

describe('ClientPaymentsService', () => {
  let service: ClientPaymentsService;

  const mockTx = {
    projectReport: { findUnique: vi.fn(), update: vi.fn() },
    clientPayment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockPrismaService = {
    $transaction: vi.fn(),
    clientPayment: { delete: vi.fn() },
    projectReport: { update: vi.fn() },
  };

  const notFound = () =>
    new PrismaClientKnownRequestError('not found', {
      code: PRISMA_ERROR_CODES.NOT_FOUND,
      clientVersion: 'x',
    });

  /** The report as incomeAndPaid reads it. */
  const reportRow = (
    income: number[],
    payments: { id: string; amount: number }[],
    vatPaidAt: Date | null = null,
  ) => ({
    vatPaidAt,
    incomeEntries: income.map((a) => ({ amount: new Prisma.Decimal(a) })),
    clientPayments: payments.map((p) => ({
      id: p.id,
      amount: new Prisma.Decimal(p.amount),
    })),
  });

  const storedPayment = (amount: number) => ({
    id: 'payment-new',
    projectReportId: 'report-1',
    amount: new Prisma.Decimal(amount),
    paymentDate: new Date('2026-05-12'),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(ClientPaymentsService);
    vi.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => unknown) => cb(mockTx),
    );
  });

  describe('create', () => {
    const dto = {
      projectReportId: 'report-1',
      amount: 400,
      paymentDate: '2026-05-12',
    };

    it('records a payment that stays within the income', async () => {
      mockTx.projectReport.findUnique.mockResolvedValue(
        reportRow([600, 400], [{ id: 'p1', amount: 600 }]),
      );
      mockTx.clientPayment.create.mockResolvedValue(storedPayment(400));

      const result = await service.create(dto);

      expect(mockTx.clientPayment.create).toHaveBeenCalledWith({
        data: {
          projectReportId: 'report-1',
          amount: new Prisma.Decimal(400),
          paymentDate: new Date('2026-05-12'),
        },
      });
      expect(result).toEqual({
        id: 'payment-new',
        projectReportId: 'report-1',
        amount: 400,
        paymentDate: '2026-05-12T00:00:00.000Z',
      });
    });

    it('refuses a payment above the income — VAT is not paid this way', async () => {
      mockTx.projectReport.findUnique.mockResolvedValue(
        reportRow([1000], [{ id: 'p1', amount: 700 }]),
      );

      const error = await service.create(dto).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ClientPaymentOverpaymentError);
      expect((error as ClientPaymentOverpaymentError).params).toEqual({
        amount: 400,
        owed: 1000,
        paid: 700,
      });
      expect(mockTx.clientPayment.create).not.toHaveBeenCalled();
    });

    it('is not fooled by floating-point noise in the running total', async () => {
      // 0.1 + 0.2 !== 0.3 in floats; in agorot it is exact.
      mockTx.projectReport.findUnique.mockResolvedValue(
        reportRow([0.3], [{ id: 'p1', amount: 0.1 }]),
      );
      mockTx.clientPayment.create.mockResolvedValue(storedPayment(0.2));

      await service.create({ ...dto, amount: 0.2 });

      expect(mockTx.clientPayment.create).toHaveBeenCalled();
    });

    it('fails with not found when the report does not exist', async () => {
      mockTx.projectReport.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ProjectReportNotFoundError,
      );
    });
  });

  describe('update', () => {
    it('changes only the date without checking the amount', async () => {
      mockTx.clientPayment.findUnique.mockResolvedValue({
        projectReportId: 'report-1',
      });
      mockTx.clientPayment.update.mockResolvedValue(storedPayment(100));

      await service.update('payment-1', { paymentDate: '2026-05-20' });

      expect(mockTx.projectReport.findUnique).not.toHaveBeenCalled();
      expect(mockTx.clientPayment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: { amount: undefined, paymentDate: new Date('2026-05-20') },
      });
    });

    it('checks a new amount against the other payments, not itself', async () => {
      mockTx.clientPayment.findUnique.mockResolvedValue({
        projectReportId: 'report-1',
      });
      mockTx.projectReport.findUnique.mockResolvedValue(
        reportRow(
          [1000],
          [
            { id: 'payment-1', amount: 900 },
            { id: 'payment-2', amount: 100 },
          ],
        ),
      );
      mockTx.clientPayment.update.mockResolvedValue(storedPayment(900));

      await service.update('payment-1', { amount: 900 });
      expect(mockTx.clientPayment.update).toHaveBeenCalled();

      await expect(
        service.update('payment-1', { amount: 901 }),
      ).rejects.toBeInstanceOf(ClientPaymentOverpaymentError);
    });

    it('fails with not found for an unknown payment', async () => {
      mockTx.clientPayment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { amount: 1 }),
      ).rejects.toBeInstanceOf(ClientPaymentNotFoundError);
    });
  });

  describe('remove', () => {
    it('deletes the payment', async () => {
      mockPrismaService.clientPayment.delete.mockResolvedValue({});

      await service.remove('payment-1');

      expect(mockPrismaService.clientPayment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      });
    });

    it('fails with not found for an unknown payment', async () => {
      mockPrismaService.clientPayment.delete.mockRejectedValue(notFound());

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        ClientPaymentNotFoundError,
      );
    });
  });

  describe('setVatPayment', () => {
    it('marks the VAT paid on a day', async () => {
      await service.setVatPayment('report-1', '2026-06-03');

      expect(mockPrismaService.projectReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { vatPaidAt: new Date('2026-06-03') },
      });
    });

    it('marks the VAT unpaid again with null', async () => {
      await service.setVatPayment('report-1', null);

      expect(mockPrismaService.projectReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { vatPaidAt: null },
      });
    });

    it('fails with not found for an unknown report', async () => {
      mockPrismaService.projectReport.update.mockRejectedValue(notFound());

      await expect(
        service.setVatPayment('missing', '2026-06-03'),
      ).rejects.toBeInstanceOf(ProjectReportNotFoundError);
    });
  });

  describe('payInFull', () => {
    it('records the income still owed and marks the VAT, on one day', async () => {
      mockTx.projectReport.findUnique.mockResolvedValue(
        reportRow([1000], [{ id: 'p1', amount: 300.5 }]),
      );

      await service.payInFull('report-1', '2026-05-20');

      expect(mockTx.clientPayment.create).toHaveBeenCalledWith({
        data: {
          projectReportId: 'report-1',
          amount: new Prisma.Decimal(699.5),
          paymentDate: new Date('2026-05-20'),
        },
      });
      expect(mockTx.projectReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { vatPaidAt: new Date('2026-05-20') },
      });
    });

    it('adds no payment when the income is already paid', async () => {
      mockTx.projectReport.findUnique.mockResolvedValue(
        reportRow([1000], [{ id: 'p1', amount: 1000 }]),
      );

      await service.payInFull('report-1', '2026-05-20');

      expect(mockTx.clientPayment.create).not.toHaveBeenCalled();
      expect(mockTx.projectReport.update).toHaveBeenCalled();
    });

    it('keeps the day of VAT already marked paid', async () => {
      mockTx.projectReport.findUnique.mockResolvedValue(
        reportRow([1000], [], new Date('2026-05-02')),
      );

      await service.payInFull('report-1', '2026-05-20');

      expect(mockTx.clientPayment.create).toHaveBeenCalled();
      expect(mockTx.projectReport.update).not.toHaveBeenCalled();
    });

    it('fails with not found for an unknown report', async () => {
      mockTx.projectReport.findUnique.mockResolvedValue(null);

      await expect(
        service.payInFull('missing', '2026-05-20'),
      ).rejects.toBeInstanceOf(ProjectReportNotFoundError);
    });
  });
});
