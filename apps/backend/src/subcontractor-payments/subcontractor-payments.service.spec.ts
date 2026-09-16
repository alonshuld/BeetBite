import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubcontractorPaymentNotFoundError } from './errors/subcontractor-payment-not-found.error';
import { SubcontractorPaymentOverpaymentError } from './errors/subcontractor-payment-overpayment.error';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';

describe('SubcontractorPaymentsService', () => {
  let service: SubcontractorPaymentsService;

  const mockPrismaService = {
    $transaction: jest
      .fn()
      .mockImplementation(
        (callback: (tx: typeof mockPrismaService) => Promise<unknown>) =>
          callback(mockPrismaService),
      ),
    subcontractorPayment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectReport: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    subcontractor: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubcontractorPaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubcontractorPaymentsService>(
      SubcontractorPaymentsService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      subcontractorId: 'clh0000000000000000000001',
      projectId: 'project-1',
      serviceDate: '2023-01-01',
      amount: 1000,
    };
    const mockPayment = {
      id: 'clh0000000000000000000001',
      projectId: 'project-1',
      serviceDate: new Date('2023-01-01'),
      amount: { toNumber: () => 1000 },
      subcontractor: {
        id: 'clh0000000000000000000001',
        name: 'Test Subcontractor',
      },
    };

    it('should create a subcontractor payment', async () => {
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 5000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);
      mockPrismaService.subcontractorPayment.create.mockResolvedValue(
        mockPayment,
      );

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockPayment.id,
        projectId: mockPayment.projectId,
        subcontractor: mockPayment.subcontractor,
        serviceDate: mockPayment.serviceDate.toISOString(),
        amount: 1000,
        paymentDate: null,
      });
      expect(
        mockPrismaService.subcontractorPayment.create,
      ).toHaveBeenCalledWith({
        data: createDto,
        select: {
          id: true,
          projectId: true,
          serviceDate: true,
          amount: true,
          isPaid: true,
          paymentDate: true,
          subcontractor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should throw SubcontractorPaymentOverpaymentError when payment exceeds amount owed', async () => {
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 1000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [],
      });
      // amountOwed = 900, already paid = 500, new amount = 1000 → overpayment
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([
        { amount: { toNumber: () => 500 } },
      ]);

      await expect(
        service.create({ ...createDto, amount: 1000 }),
      ).rejects.toThrow(SubcontractorPaymentOverpaymentError);
    });

    // 🔴 serviceDate says which month is being settled; paymentDate says when
    // the money moved. A payment made on the 17th still settles the month that
    // starts on the 1st. Conflating the two is the failure this guards.
    it('keeps the settled month and the payment day distinct', async () => {
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 5000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);
      mockPrismaService.subcontractorPayment.create.mockResolvedValue({
        ...mockPayment,
        paymentDate: new Date('2023-01-17'),
      });

      const result = await service.create({
        ...createDto,
        paymentDate: '2023-01-17',
      });

      expect(result.serviceDate).toBe('2023-01-01T00:00:00.000Z');
      expect(result.paymentDate).toBe('2023-01-17T00:00:00.000Z');
      // The row written carries both, unchanged.
      const call = (
        mockPrismaService.subcontractorPayment.create.mock.calls as unknown[][]
      )[0][0] as { data: { serviceDate: string; paymentDate?: string } };
      expect(call.data.serviceDate).toBe('2023-01-01');
      expect(call.data.paymentDate).toBe('2023-01-17');
    });

    it('records a payment with no date at all', async () => {
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 5000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);
      mockPrismaService.subcontractorPayment.create.mockResolvedValue(
        mockPayment,
      );

      const result = await service.create(createDto);

      expect(result.paymentDate).toBeNull();
    });

    it('should throw SubcontractorNotFoundError when subcontractor does not exist', async () => {
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 5000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      const prismaError = new PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field: `subcontractorId`',
        {
          code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.subcontractorPayment.create.mockRejectedValue(
        prismaError,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });
  });

  describe('findSubcontractorPaymentsInMonth', () => {
    it('should return grouped payments for a month', async () => {
      const mockSubcontractors = [
        {
          id: 'clh0000000000000000000001',
          name: 'Subcontractor 1',
          payments: [
            {
              id: 'payment-1',
              serviceDate: new Date('2023-01-01'),
              amount: { toNumber: () => 1000 },
            },
          ],
        },
        {
          id: 'clh0000000000000000000002',
          name: 'Subcontractor 2',
          payments: [
            {
              id: 'payment-2',
              serviceDate: new Date('2023-01-01'),
              amount: { toNumber: () => 2000 },
            },
          ],
        },
      ];

      mockPrismaService.subcontractor.findMany.mockResolvedValue(
        mockSubcontractors,
      );
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.findSubcontractorPaymentsInMonth({
        month: '2023-01-01',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        subcontractor: {
          id: 'clh0000000000000000000001',
          name: 'Subcontractor 1',
        },
        serviceDate: new Date('2023-01-01').toISOString(),
        amountOwed: 0,
        amountPaid: 1000,
        payments: [{ id: 'payment-1', amount: 1000 }],
      });
      expect(result[1]).toMatchObject({
        subcontractor: {
          id: 'clh0000000000000000000002',
          name: 'Subcontractor 2',
        },
        serviceDate: new Date('2023-01-01').toISOString(),
        amountOwed: 0,
        amountPaid: 2000,
        payments: [{ id: 'payment-2', amount: 2000 }],
      });
    });

    it('should return an empty list if no payments found', async () => {
      mockPrismaService.subcontractor.findMany.mockResolvedValue([]);
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.findSubcontractorPaymentsInMonth({
        month: '2023-03-01',
      });

      expect(result).toEqual([]);
    });

    it('should accumulate amountPaid across multiple partial payments for the same subcontractor', async () => {
      const mockSubcontractors = [
        {
          id: 'clh0000000000000000000001',
          name: 'Subcontractor 1',
          payments: [
            {
              id: 'payment-a',
              serviceDate: new Date('2023-01-01'),
              amount: { toNumber: () => 300 },
            },
            {
              id: 'payment-b',
              serviceDate: new Date('2023-01-01'),
              amount: { toNumber: () => 200 },
            },
            {
              id: 'payment-c',
              serviceDate: new Date('2023-01-01'),
              amount: { toNumber: () => 400 },
            },
          ],
        },
      ];

      mockPrismaService.subcontractor.findMany.mockResolvedValue(
        mockSubcontractors,
      );
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.findSubcontractorPaymentsInMonth({
        month: '2023-01-01',
      });

      expect(result).toHaveLength(1);
      expect(result[0].amountPaid).toBe(900);
      expect(result[0].payments).toHaveLength(3);
    });
  });

  describe('findSubcontractorMonthlyPayments', () => {
    it('should return monthly payments for a specific subcontractor', async () => {
      const mockSubcontractor = {
        id: 'clh0000000000000000000001',
        name: 'Test Subcontractor',
        payments: [
          {
            id: 'payment-1',
            serviceDate: new Date('2023-01-01'),
            amount: { toNumber: () => 1000 },
          },
        ],
      };

      mockPrismaService.subcontractor.findUnique.mockResolvedValue(
        mockSubcontractor,
      );
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.findSubcontractorMonthlyPayments(
        'clh0000000000000000000001',
        {
          month: '2023-01-01',
        },
      );

      expect(result).toMatchObject({
        subcontractor: {
          id: 'clh0000000000000000000001',
          name: 'Test Subcontractor',
        },
        serviceDate: new Date('2023-01-01').toISOString(),
        amountOwed: 0,
        amountPaid: 1000,
        payments: [{ id: 'payment-1', amount: 1000 }],
      });
    });

    it('should throw SubcontractorNotFoundError if subcontractor not found', async () => {
      mockPrismaService.subcontractor.findUnique.mockResolvedValue(null);
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      await expect(
        service.findSubcontractorMonthlyPayments('clh0000000000000000000999', {
          month: '2023-01-01',
        }),
      ).rejects.toThrow(SubcontractorNotFoundError);
    });
  });

  describe('findByClient', () => {
    it('should return aggregated payments per client', async () => {
      const mockPayments = [
        {
          amount: { toNumber: () => 1000 },
          project: { client: { id: 'client-1', name: 'Client A' } },
        },
        {
          amount: { toNumber: () => 2000 },
          project: { client: { id: 'client-1', name: 'Client A' } },
        },
        {
          amount: { toNumber: () => 500 },
          project: { client: { id: 'client-2', name: 'Client B' } },
        },
      ];

      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue(
        mockPayments,
      );

      const result = await service.findByClient({ month: '2023-01-01' });

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        clientId: 'client-1',
        clientName: 'Client A',
        totalSubcontractorPayments: 3000,
      });
      expect(result).toContainEqual({
        clientId: 'client-2',
        clientName: 'Client B',
        totalSubcontractorPayments: 500,
      });
    });

    it('should return empty list if no payments found', async () => {
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      const result = await service.findByClient({ month: '2023-03-01' });

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const updateDto = {
      subcontractorId: 'clh0000000000000000000001',
      projectId: 'project-1',
      serviceDate: '2023-01-01',
      amount: 1500,
    };

    it('should skip the overpayment guard for an isPaid-only update', async () => {
      const mockPayment = {
        id: 'clh0000000000000000000001',
        projectId: 'project-1',
        serviceDate: new Date('2023-01-01'),
        amount: { toNumber: () => 900 },
        subcontractor: {
          id: 'clh0000000000000000000001',
          name: 'Test Subcontractor',
        },
      };
      mockPrismaService.subcontractorPayment.update.mockResolvedValue(
        mockPayment,
      );

      await service.update('clh0000000000000000000001', { isPaid: true });

      // No amount was sent, so the guard must not look up the owed total.
      expect(mockPrismaService.projectReport.findFirst).not.toHaveBeenCalled();
      expect(
        mockPrismaService.subcontractorPayment.findMany,
      ).not.toHaveBeenCalled();
      expect(
        mockPrismaService.subcontractorPayment.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'clh0000000000000000000001' },
          data: { isPaid: true },
        }),
      );
    });

    it('should throw SubcontractorPaymentOverpaymentError when updated amount exceeds amount owed', async () => {
      // amountOwed = 900. Other payments = 600. New amount = 400 → total 1000 > 900
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 1000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([
        { amount: { toNumber: () => 600 } },
      ]);

      await expect(
        service.update('clh0000000000000000000001', {
          ...updateDto,
          amount: 400,
        }),
      ).rejects.toThrow(SubcontractorPaymentOverpaymentError);
    });

    it('should allow updating a payment when new amount is within owed limit', async () => {
      // amountOwed = 900. Other payments = 0. New amount = 900 → exactly at limit
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 1000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      const mockPayment = {
        id: 'clh0000000000000000000001',
        projectId: 'project-1',
        serviceDate: new Date('2023-01-01'),
        amount: { toNumber: () => 900 },
        subcontractor: {
          id: 'clh0000000000000000000001',
          name: 'Test Subcontractor',
        },
      };
      mockPrismaService.subcontractorPayment.update.mockResolvedValue(
        mockPayment,
      );

      const result = await service.update('clh0000000000000000000001', {
        ...updateDto,
        amount: 900,
      });
      expect(result.amount).toBe(900);
    });

    it('should update a subcontractor payment', async () => {
      const mockPayment = {
        id: 'clh0000000000000000000001',
        projectId: 'project-1',
        serviceDate: new Date('2023-01-01'),
        amount: { toNumber: () => 1500 },
        subcontractor: {
          id: 'clh0000000000000000000001',
          name: 'Test Subcontractor',
        },
      };

      // amountOwed = 1800, existing other payments = 0, new amount = 1500 → ok
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 2000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);
      mockPrismaService.subcontractorPayment.update.mockResolvedValue(
        mockPayment,
      );

      const result = await service.update(
        'clh0000000000000000000001',
        updateDto,
      );

      expect(result).toEqual({
        id: mockPayment.id,
        projectId: mockPayment.projectId,
        subcontractor: mockPayment.subcontractor,
        serviceDate: mockPayment.serviceDate.toISOString(),
        amount: 1500,
        paymentDate: null,
      });
      expect(
        mockPrismaService.subcontractorPayment.update,
      ).toHaveBeenCalledWith({
        where: { id: 'clh0000000000000000000001' },
        data: updateDto,
        select: {
          id: true,
          projectId: true,
          serviceDate: true,
          amount: true,
          isPaid: true,
          paymentDate: true,
          subcontractor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should throw SubcontractorPaymentNotFoundError if payment not found', async () => {
      // amountOwed = 1800, new amount = 1500 → passes overpayment guard
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 2000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      const prismaError = new PrismaClientKnownRequestError(
        'Record to update does not exist.',
        {
          code: PRISMA_ERROR_CODES.NOT_FOUND,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.subcontractorPayment.update.mockRejectedValue(
        prismaError,
      );

      await expect(
        service.update('clh0000000000000000000999', updateDto),
      ).rejects.toThrow(SubcontractorPaymentNotFoundError);
    });
  });

  describe('remove', () => {
    it('should remove a subcontractor payment', async () => {
      mockPrismaService.subcontractorPayment.delete.mockResolvedValue({});

      await expect(
        service.remove('clh0000000000000000000001'),
      ).resolves.toBeUndefined();

      expect(
        mockPrismaService.subcontractorPayment.delete,
      ).toHaveBeenCalledWith({
        where: { id: 'clh0000000000000000000001' },
      });
    });

    it('should throw SubcontractorPaymentNotFoundError if payment not found', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record to delete does not exist.',
        {
          code: PRISMA_ERROR_CODES.NOT_FOUND,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.subcontractorPayment.delete.mockRejectedValue(
        prismaError,
      );

      await expect(service.remove('clh0000000000000000000999')).rejects.toThrow(
        SubcontractorPaymentNotFoundError,
      );
    });
  });

  describe('overpayment guard (cents-based comparison)', () => {
    const createDto = {
      subcontractorId: 'clh0000000000000000000001',
      projectId: 'project-1',
      serviceDate: '2023-01-01',
      amount: 0,
    };

    const mockCreated = {
      id: 'payment-1',
      projectId: 'project-1',
      serviceDate: new Date('2023-01-01'),
      amount: { toNumber: () => 0 },
      subcontractor: { id: 'clh0000000000000000000001', name: 'Sub' },
    };

    /** Sets up a project report whose computed amount owed equals `owed`. */
    const mockOwed = (owed: number) =>
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => owed } }],
        profitMargin: { toNumber: () => 0 },
        supplierPayments: [],
      });

    it('should NOT reject a fractional payment that exactly reaches the owed amount (owed=7988.44, paid=0.44, new=7988)', async () => {
      mockOwed(7988.44);
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([
        { amount: { toNumber: () => 0.44 } },
      ]);
      mockPrismaService.subcontractorPayment.create.mockResolvedValue(
        mockCreated,
      );

      await expect(
        service.create({ ...createDto, amount: 7988 }),
      ).resolves.toBeDefined();
    });

    it('should allow a payment exactly equal to the owed amount (boundary)', async () => {
      mockOwed(1000);
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);
      mockPrismaService.subcontractorPayment.create.mockResolvedValue(
        mockCreated,
      );

      await expect(
        service.create({ ...createDto, amount: 1000 }),
      ).resolves.toBeDefined();
    });

    it('should reject a payment that overshoots the owed amount by one agora (0.01)', async () => {
      mockOwed(100);
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      await expect(
        service.create({ ...createDto, amount: 100.01 }),
      ).rejects.toThrow(SubcontractorPaymentOverpaymentError);
    });

    it('should reject a fractional payment one agora over the owed amount (owed=7988.44, paid=0.44, new=7988.01)', async () => {
      mockOwed(7988.44);
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([
        { amount: { toNumber: () => 0.44 } },
      ]);

      await expect(
        service.create({ ...createDto, amount: 7988.01 }),
      ).rejects.toThrow(SubcontractorPaymentOverpaymentError);
    });

    it('should sum multiple existing instalments before applying the guard', async () => {
      // owed=1000, existing instalments 300 + 250 + 400 = 950, new 60 -> 1010 > 1000
      mockOwed(1000);
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([
        { amount: { toNumber: () => 300 } },
        { amount: { toNumber: () => 250 } },
        { amount: { toNumber: () => 400 } },
      ]);

      await expect(
        service.create({ ...createDto, amount: 60 }),
      ).rejects.toThrow(SubcontractorPaymentOverpaymentError);
    });

    it('should subtract supplier payments and profit margin from income when computing the owed amount', async () => {
      // income=10000, margin=10% -> 9000, corp payments 2500 -> owed 6500
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 10000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [
          { amount: { toNumber: () => 1500 } },
          { amount: { toNumber: () => 1000 } },
        ],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      // 6501 > 6500 -> rejected, proves the owed amount is exactly 6500
      await expect(
        service.create({ ...createDto, amount: 6501 }),
      ).rejects.toThrow(SubcontractorPaymentOverpaymentError);
    });

    it('should treat the owed amount as zero (not negative) when supplier payments exceed income minus profit', async () => {
      // income=1000, margin=10% -> 900, corp payments 1500 -> raw owed = -600, floored to 0
      mockPrismaService.projectReport.findFirst.mockResolvedValue({
        incomeEntries: [{ amount: { toNumber: () => 1000 } }],
        profitMargin: { toNumber: () => 10 },
        supplierPayments: [{ amount: { toNumber: () => 1500 } }],
      });
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      await expect(service.create({ ...createDto, amount: 1 })).rejects.toThrow(
        SubcontractorPaymentOverpaymentError,
      );
    });
  });

  describe('amount owed aggregation (monthly)', () => {
    it('should floor each project at zero so an overpaid project does not cancel out another project owed (BUG regression)', async () => {
      // Project A: income 1000, margin 0, corp 1500 -> raw -500 -> floored to 0
      // Project B: income 2000, margin 0, corp 0    -> 2000
      // Correct monthly owed = 0 + 2000 = 2000 (NOT 1500 if the negative leaked)
      mockPrismaService.subcontractor.findUnique.mockResolvedValue({
        id: 'sub-1',
        name: 'Sub 1',
        payments: [],
      });
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          profitMargin: { toNumber: () => 0 },
          incomeEntries: [{ amount: { toNumber: () => 1000 } }],
          supplierPayments: [{ amount: { toNumber: () => 1500 } }],
        },
        {
          profitMargin: { toNumber: () => 0 },
          incomeEntries: [{ amount: { toNumber: () => 2000 } }],
          supplierPayments: [],
        },
      ]);

      const result = await service.findSubcontractorMonthlyPayments('sub-1', {
        month: '2023-01-01',
      });

      expect(result.amountOwed).toBe(2000);
    });

    it('should compute amountOwed across all subcontractors flooring negatives per project', async () => {
      mockPrismaService.subcontractor.findMany.mockResolvedValue([
        { id: 'sub-1', name: 'Sub 1', payments: [] },
      ]);
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          subcontractorId: 'sub-1',
          profitMargin: { toNumber: () => 0 },
          incomeEntries: [{ amount: { toNumber: () => 500 } }],
          supplierPayments: [{ amount: { toNumber: () => 900 } }], // raw -400 -> 0
        },
        {
          subcontractorId: 'sub-1',
          profitMargin: { toNumber: () => 0 },
          incomeEntries: [{ amount: { toNumber: () => 3000 } }],
          supplierPayments: [{ amount: { toNumber: () => 500 } }], // 2500
        },
      ]);

      const result = await service.findSubcontractorPaymentsInMonth({
        month: '2023-01-01',
      });

      expect(result).toHaveLength(1);
      expect(result[0].amountOwed).toBe(2500);
    });
  });
});
