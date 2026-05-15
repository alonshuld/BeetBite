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
      subcontractorId: '1',
      serviceDate: '2023-01-01',
      paymentDate: '2023-01-15',
      amount: 1000,
    };
    const mockPayment = {
      id: '1',
      serviceDate: new Date('2023-01-01'),
      paymentDate: new Date('2023-01-15'),
      amount: { toNumber: () => 1000 },
      subcontractor: {
        id: '1',
        name: 'Test Subcontractor',
      },
    };

    it('should create a subcontractor payment', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          income: { toNumber: () => 5000 },
          profitMargin: { toNumber: () => 10 },
          corporationPayments: [],
        },
      ]);
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);
      mockPrismaService.subcontractorPayment.create.mockResolvedValue(
        mockPayment,
      );

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockPayment.id,
        subcontractor: mockPayment.subcontractor,
        serviceDate: mockPayment.serviceDate.toISOString(),
        paymentDate: mockPayment.paymentDate.toISOString(),
        amount: 1000,
      });
      expect(
        mockPrismaService.subcontractorPayment.create,
      ).toHaveBeenCalledWith({
        data: createDto,
        select: {
          id: true,
          serviceDate: true,
          paymentDate: true,
          amount: true,
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
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          income: { toNumber: () => 1000 },
          profitMargin: { toNumber: () => 10 },
          corporationPayments: [],
        },
      ]);
      // amountOwed = 1000 - 100 = 900, already paid = 500, new amount = 1000 → overpayment
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([
        { amount: { toNumber: () => 500 } },
      ]);

      await expect(
        service.create({ ...createDto, amount: 1000 }),
      ).rejects.toThrow(SubcontractorPaymentOverpaymentError);
    });

    it('should throw SubcontractorNotFoundError when subcontractor does not exist', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          income: { toNumber: () => 5000 },
          profitMargin: { toNumber: () => 10 },
          corporationPayments: [],
        },
      ]);
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
          id: '1',
          name: 'Subcontractor 1',
          payments: [
            {
              id: 'payment-1',
              serviceDate: new Date('2023-01-01'),
              paymentDate: new Date('2023-01-15'),
              amount: { toNumber: () => 1000 },
            },
          ],
        },
        {
          id: '2',
          name: 'Subcontractor 2',
          payments: [
            {
              id: 'payment-2',
              serviceDate: new Date('2023-01-01'),
              paymentDate: new Date('2023-01-20'),
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
        subcontractor: { id: '1', name: 'Subcontractor 1' },
        serviceDate: new Date('2023-01-01').toISOString(),
        amountOwed: 0,
        amountPaid: 1000,
        payments: [
          {
            id: 'payment-1',
            paymentDate: '2023-01-15T00:00:00.000Z',
            amount: 1000,
          },
        ],
      });
      expect(result[1]).toMatchObject({
        subcontractor: { id: '2', name: 'Subcontractor 2' },
        serviceDate: new Date('2023-01-01').toISOString(),
        amountOwed: 0,
        amountPaid: 2000,
        payments: [
          {
            id: 'payment-2',
            paymentDate: '2023-01-20T00:00:00.000Z',
            amount: 2000,
          },
        ],
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
  });

  describe('findSubcontractorMonthlyPayments', () => {
    it('should return monthly payments for a specific subcontractor', async () => {
      const mockSubcontractor = {
        id: '1',
        name: 'Test Subcontractor',
        payments: [
          {
            id: 'payment-1',
            serviceDate: new Date('2023-01-01'),
            paymentDate: new Date('2023-01-15'),
            amount: { toNumber: () => 1000 },
          },
        ],
      };

      mockPrismaService.subcontractor.findUnique.mockResolvedValue(
        mockSubcontractor,
      );
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.findSubcontractorMonthlyPayments('1', {
        month: '2023-01-01',
      });

      expect(result).toMatchObject({
        subcontractor: {
          id: '1',
          name: 'Test Subcontractor',
        },
        serviceDate: new Date('2023-01-01').toISOString(),
        amountOwed: 0,
        amountPaid: 1000,
        payments: [
          {
            id: 'payment-1',
            paymentDate: '2023-01-15T00:00:00.000Z',
            amount: 1000,
          },
        ],
      });
    });

    it('should throw SubcontractorNotFoundError if subcontractor not found', async () => {
      mockPrismaService.subcontractor.findUnique.mockResolvedValue(null);
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      await expect(
        service.findSubcontractorMonthlyPayments('999', {
          month: '2023-01-01',
        }),
      ).rejects.toThrow(SubcontractorNotFoundError);
    });
  });

  describe('update', () => {
    const updateDto = {
      subcontractorId: '1',
      serviceDate: '2023-01-01',
      paymentDate: '2023-02-01',
      amount: 1500,
    };

    it('should throw SubcontractorPaymentOverpaymentError when updated amount exceeds amount owed', async () => {
      // amountOwed = 1000 - 100 = 900. Other payments = 600. New amount = 400 → total 1000 > 900
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          income: { toNumber: () => 1000 },
          profitMargin: { toNumber: () => 10 },
          corporationPayments: [],
        },
      ]);
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([
        { amount: { toNumber: () => 600 } },
      ]);

      await expect(
        service.update('1', { ...updateDto, amount: 400 }),
      ).rejects.toThrow(SubcontractorPaymentOverpaymentError);
    });

    it('should allow updating a payment when new amount is within owed limit', async () => {
      // amountOwed = 900. Other payments = 0. New amount = 900 → exactly at limit
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          income: { toNumber: () => 1000 },
          profitMargin: { toNumber: () => 10 },
          corporationPayments: [],
        },
      ]);
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      const mockPayment = {
        id: '1',
        serviceDate: new Date('2023-01-01'),
        paymentDate: new Date('2023-02-01'),
        amount: { toNumber: () => 900 },
        subcontractor: { id: '1', name: 'Test Subcontractor' },
      };
      mockPrismaService.subcontractorPayment.update.mockResolvedValue(
        mockPayment,
      );

      const result = await service.update('1', { ...updateDto, amount: 900 });
      expect(result.amount).toBe(900);
    });

    it('should update a subcontractor payment', async () => {
      const mockPayment = {
        id: '1',
        serviceDate: new Date('2023-01-01'),
        paymentDate: new Date('2023-02-01'),
        amount: { toNumber: () => 1500 },
        subcontractor: {
          id: '1',
          name: 'Test Subcontractor',
        },
      };

      // amountOwed = 2000 - 200 = 1800, existing other payments = 0, new amount = 1500 → ok
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          income: { toNumber: () => 2000 },
          profitMargin: { toNumber: () => 10 },
          corporationPayments: [],
        },
      ]);
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);
      mockPrismaService.subcontractorPayment.update.mockResolvedValue(
        mockPayment,
      );

      const result = await service.update('1', updateDto);

      expect(result).toEqual({
        id: mockPayment.id,
        subcontractor: mockPayment.subcontractor,
        serviceDate: mockPayment.serviceDate.toISOString(),
        paymentDate: mockPayment.paymentDate.toISOString(),
        amount: 1500,
      });
      expect(
        mockPrismaService.subcontractorPayment.update,
      ).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
        select: {
          id: true,
          serviceDate: true,
          paymentDate: true,
          amount: true,
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
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          income: { toNumber: () => 2000 },
          profitMargin: { toNumber: () => 10 },
          corporationPayments: [],
        },
      ]);
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

      await expect(service.update('999', updateDto)).rejects.toThrow(
        SubcontractorPaymentNotFoundError,
      );
    });
  });

  describe('remove', () => {
    it('should remove a subcontractor payment', async () => {
      mockPrismaService.subcontractorPayment.delete.mockResolvedValue({});

      await expect(service.remove('1')).resolves.toBeUndefined();

      expect(
        mockPrismaService.subcontractorPayment.delete,
      ).toHaveBeenCalledWith({
        where: { id: '1' },
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

      await expect(service.remove('999')).rejects.toThrow(
        SubcontractorPaymentNotFoundError,
      );
    });
  });
});
