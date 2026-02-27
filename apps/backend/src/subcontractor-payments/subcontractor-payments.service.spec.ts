import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubcontractorPaymentNotFoundError } from './errors/subcontractor-payment-not-found.error';
import { SubcontractorPaymentAlreadyExistsError } from './errors/subcontractor-payment-already-exists.error';
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
      serviceDate: '2023-01',
      paymentDate: '2023-01',
    };
    const mockPayment = {
      id: '1',
      subcontractorId: '1',
      serviceDate: new Date('2023-01'),
      paymentDate: new Date('2023-01'),
    };

    it('should create a subcontractor payment', async () => {
      mockPrismaService.subcontractorPayment.create.mockResolvedValue(
        mockPayment,
      );
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockPayment.id,
        subcontractorId: mockPayment.subcontractorId,
        serviceDate: mockPayment.serviceDate.toISOString(),
        paymentDate: mockPayment.paymentDate.toISOString(),
        amount: 0,
      });
      expect(
        mockPrismaService.subcontractorPayment.create,
      ).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw an error on duplicate payment', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`subcontractorId`, `serviceDate`)',
        {
          code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.subcontractorPayment.create.mockRejectedValue(
        prismaError,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        SubcontractorPaymentAlreadyExistsError,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of subcontractor payments', async () => {
      const mockPayments = [
        {
          id: '1',
          subcontractorId: '1',
          serviceDate: new Date('2023-01'),
          paymentDate: new Date('2023-01'),
        },
        {
          id: '2',
          subcontractorId: '2',
          serviceDate: new Date('2023-02'),
          paymentDate: new Date('2023-02'),
        },
      ];

      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue(
        mockPayments,
      );

      const result = await service.findAll({
        month: '2023-01',
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(
        mockPayments.map((payment) => ({
          id: payment.id,
          subcontractorId: payment.subcontractorId,
          serviceDate: payment.serviceDate.toISOString(),
          paymentDate: payment.paymentDate.toISOString(),
          amount: 0,
        })),
      );
      expect(
        mockPrismaService.subcontractorPayment.findMany,
      ).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { serviceDate: '2023-01' },
      });
    });

    it('should return an empty list if no payments found', async () => {
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      const result = await service.findAll({
        month: '2023-03',
        page: 1,
        limit: 10,
      });

      expect(result).toEqual([]);
      expect(
        mockPrismaService.subcontractorPayment.findMany,
      ).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { serviceDate: '2023-03' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a subcontractor payment by ID', async () => {
      const mockPayment = {
        id: '1',
        subcontractorId: '1',
        serviceDate: new Date('2023-01'),
        paymentDate: new Date('2023-01'),
      };

      mockPrismaService.subcontractorPayment.findUnique.mockResolvedValue(
        mockPayment,
      );
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.findOne('1');

      expect(result).toEqual({
        id: mockPayment.id,
        subcontractorId: mockPayment.subcontractorId,
        serviceDate: mockPayment.serviceDate.toISOString(),
        paymentDate: mockPayment.paymentDate.toISOString(),
        amount: 0,
      });
      expect(
        mockPrismaService.subcontractorPayment.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw SubcontractorPaymentNotFoundException if payment not found', async () => {
      mockPrismaService.subcontractorPayment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(
        SubcontractorPaymentNotFoundError,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      subcontractorId: '1',
      serviceDate: '2023-01',
      paymentDate: '2023-02',
    };

    it('should update a subcontractor payment', async () => {
      const mockPayment = {
        id: '1',
        subcontractorId: '1',
        serviceDate: new Date('2023-01'),
        paymentDate: new Date('2023-02'),
      };

      mockPrismaService.subcontractorPayment.update.mockResolvedValue(
        mockPayment,
      );
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.update('1', updateDto);

      expect(result).toEqual({
        id: mockPayment.id,
        subcontractorId: mockPayment.subcontractorId,
        serviceDate: mockPayment.serviceDate.toISOString(),
        paymentDate: mockPayment.paymentDate.toISOString(),
        amount: 0,
      });
      expect(
        mockPrismaService.subcontractorPayment.update,
      ).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
    });

    it('should throw SubcontractorPaymentNotFoundException if payment not found', async () => {
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

    it('should throw SubcontractorPaymentNotFoundException if payment not found', async () => {
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

  describe('Integration Tests with Subcontractors', () => {
    let integrationService: SubcontractorPaymentsService;
    const integrationMockPrismaService = {
      subcontractorPayment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      subcontractor: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectReport: {
        findMany: jest.fn(),
      },
    };

    beforeEach(async () => {
      const integrationModule: TestingModule = await Test.createTestingModule({
        providers: [
          SubcontractorPaymentsService,
          {
            provide: PrismaService,
            useValue: integrationMockPrismaService,
          },
        ],
      }).compile();

      integrationService = integrationModule.get<SubcontractorPaymentsService>(
        SubcontractorPaymentsService,
      );

      jest.clearAllMocks();
    });

    describe('create with subcontractor validation', () => {
      const createDto = {
        subcontractorId: 'sub-integration',
        serviceDate: '2023-01-01',
        paymentDate: '2023-01-15',
      };

      it('should create a payment when subcontractor exists', async () => {
        const mockPayment = {
          id: 'payment-integration',
          subcontractorId: 'sub-integration',
          serviceDate: new Date('2023-01-01'),
          paymentDate: new Date('2023-01-15'),
        };

        integrationMockPrismaService.subcontractorPayment.create.mockResolvedValue(
          mockPayment,
        );
        integrationMockPrismaService.projectReport.findMany.mockResolvedValue(
          [],
        );

        const result = await integrationService.create(createDto);

        expect(result).toEqual({
          id: mockPayment.id,
          subcontractorId: mockPayment.subcontractorId,
          serviceDate: mockPayment.serviceDate.toISOString(),
          paymentDate: mockPayment.paymentDate.toISOString(),
          amount: 0,
        });
        expect(
          integrationMockPrismaService.subcontractorPayment.create,
        ).toHaveBeenCalledWith({
          data: createDto,
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

        integrationMockPrismaService.subcontractorPayment.create.mockRejectedValue(
          prismaError,
        );

        await expect(integrationService.create(createDto)).rejects.toThrow(
          SubcontractorNotFoundError,
        );
      });

      it('should throw SubcontractorPaymentAlreadyExistsError when duplicate payment exists', async () => {
        const prismaError = new PrismaClientKnownRequestError(
          'Unique constraint failed on the fields: (`subcontractorId`,`serviceDate`)',
          {
            code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
            clientVersion: '4.0.0',
          },
        );

        integrationMockPrismaService.subcontractorPayment.create.mockRejectedValue(
          prismaError,
        );

        await expect(integrationService.create(createDto)).rejects.toThrow(
          SubcontractorPaymentAlreadyExistsError,
        );
      });
    });

    describe('findAll with subcontractor filtering', () => {
      it('should return payments for a specific service month', async () => {
        const mockPayments = [
          {
            id: 'payment-1',
            subcontractorId: 'sub-1',
            serviceDate: new Date('2023-01-01'),
            paymentDate: new Date('2023-01-15'),
          },
          {
            id: 'payment-2',
            subcontractorId: 'sub-2',
            serviceDate: new Date('2023-01-01'),
            paymentDate: new Date('2023-01-20'),
          },
        ];

        integrationMockPrismaService.subcontractorPayment.findMany.mockResolvedValue(
          mockPayments,
        );

        const result = await integrationService.findAll({
          month: '2023-01',
          page: 1,
          limit: 10,
        });

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          id: 'payment-1',
          subcontractorId: 'sub-1',
          serviceDate: '2023-01-01T00:00:00.000Z',
          paymentDate: '2023-01-15T00:00:00.000Z',
          amount: 0,
        });
        expect(
          integrationMockPrismaService.subcontractorPayment.findMany,
        ).toHaveBeenCalledWith({
          skip: 0,
          take: 10,
          where: { serviceDate: '2023-01' },
        });
      });

      it('should return empty array when no payments found for the month', async () => {
        integrationMockPrismaService.subcontractorPayment.findMany.mockResolvedValue(
          [],
        );

        const result = await integrationService.findAll({
          month: '2023-12',
          page: 1,
          limit: 10,
        });

        expect(result).toEqual([]);
      });
    });

    describe('subcontractor payment relationship validation', () => {
      it('should handle payment creation with valid subcontractor ID', async () => {
        const validSubcontractorId = 'valid-sub-id';
        const createDto = {
          subcontractorId: validSubcontractorId,
          serviceDate: '2023-01-01',
          paymentDate: '2023-01-15',
        };

        const mockPayment = {
          id: 'payment-valid',
          ...createDto,
          serviceDate: new Date(createDto.serviceDate),
          paymentDate: new Date(createDto.paymentDate),
        };

        integrationMockPrismaService.subcontractorPayment.create.mockResolvedValue(
          mockPayment,
        );
        integrationMockPrismaService.projectReport.findMany.mockResolvedValue(
          [],
        );

        const result = await integrationService.create(createDto);

        expect(result.subcontractorId).toBe(validSubcontractorId);
        expect(result.amount).toBe(0);
        expect(
          integrationMockPrismaService.subcontractorPayment.create,
        ).toHaveBeenCalledWith({
          data: createDto,
        });
      });

      it('should handle multiple payments for different subcontractors in same month', async () => {
        const payments = [
          {
            id: 'payment-1',
            subcontractorId: 'sub-1',
            serviceDate: new Date('2023-01-01'),
            paymentDate: new Date('2023-01-15'),
          },
          {
            id: 'payment-2',
            subcontractorId: 'sub-2',
            serviceDate: new Date('2023-01-01'),
            paymentDate: new Date('2023-01-20'),
          },
        ];

        integrationMockPrismaService.subcontractorPayment.findMany.mockResolvedValue(
          payments,
        );

        const result = await integrationService.findAll({
          month: '2023-01',
        });

        expect(result).toHaveLength(2);
        expect(result.map((p) => p.subcontractorId)).toEqual([
          'sub-1',
          'sub-2',
        ]);
        expect(result.every((p) => p.amount === 0)).toBe(true);
      });
    });
  });
});
