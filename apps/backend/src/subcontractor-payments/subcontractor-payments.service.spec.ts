import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubcontractorPaymentNotFoundError } from './errors/subcontractor-payment-not-found.error';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';

describe('SubcontractorPaymentsService', () => {
  let service: SubcontractorPaymentsService;

  const mockPrismaService = {
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
      subcontractorId: '1',
      serviceDate: new Date('2023-01-01'),
      paymentDate: new Date('2023-01-15'),
      amount: { toNumber: () => 1000 },
      subcontractor: {
        id: '1',
        name: 'Test Subcontractor',
      },
    };

    it('should create a subcontractor payment', async () => {
      mockPrismaService.subcontractorPayment.create.mockResolvedValue(
        mockPayment,
      );

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockPayment.id,
        subcontractor: mockPayment.subcontractor,
        subcontractorId: mockPayment.subcontractorId,
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

    it('should throw SubcontractorNotFoundError when subcontractor does not exist', async () => {
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
    it('should return a list of subcontractor payments for a month', async () => {
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
        month: '2023-01',
      });

      expect(result[0]).toMatchObject({
        subcontractor: {
          id: '1',
          name: 'Subcontractor 1',
        },
        payments: [
          {
            id: 'payment-1',
            serviceDate: '2023-01-01T00:00:00.000Z',
            paymentDate: '2023-01-15T00:00:00.000Z',
            amount: 1000,
          },
        ],
        total: 1000,
        expectedTotal: 0,
      });
      expect(result[1]).toMatchObject({
        subcontractor: {
          id: '2',
          name: 'Subcontractor 2',
        },
        payments: [
          {
            id: 'payment-2',
            serviceDate: '2023-01-01T00:00:00.000Z',
            paymentDate: '2023-01-20T00:00:00.000Z',
            amount: 2000,
          },
        ],
        total: 2000,
        expectedTotal: 0,
      });
    });

    it('should return an empty list if no payments found', async () => {
      mockPrismaService.subcontractor.findMany.mockResolvedValue([]);
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.findSubcontractorPaymentsInMonth({
        month: '2023-03',
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
        month: '2023-01',
      });

      expect(result).toMatchObject({
        subcontractor: {
          id: '1',
          name: 'Test Subcontractor',
        },
        payments: [
          {
            id: 'payment-1',
            serviceDate: '2023-01-01T00:00:00.000Z',
            paymentDate: '2023-01-15T00:00:00.000Z',
            amount: 1000,
          },
        ],
        total: 1000,
        expectedTotal: 0,
      });
    });

    it('should throw SubcontractorNotFoundError if subcontractor not found', async () => {
      mockPrismaService.subcontractor.findUnique.mockResolvedValue(null);

      await expect(
        service.findSubcontractorMonthlyPayments('999', { month: '2023-01' }),
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

    it('should update a subcontractor payment', async () => {
      const mockPayment = {
        id: '1',
        subcontractorId: '1',
        serviceDate: new Date('2023-01-01'),
        paymentDate: new Date('2023-02-01'),
        amount: { toNumber: () => 1500 },
        subcontractor: {
          id: '1',
          name: 'Test Subcontractor',
        },
      };

      mockPrismaService.subcontractorPayment.update.mockResolvedValue(
        mockPayment,
      );

      const result = await service.update('1', updateDto);

      expect(result).toEqual({
        id: mockPayment.id,
        subcontractor: mockPayment.subcontractor,
        subcontractorId: mockPayment.subcontractorId,
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
