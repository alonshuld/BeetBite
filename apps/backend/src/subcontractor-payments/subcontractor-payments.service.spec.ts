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
<<<<<<< HEAD
=======
      subcontractorId: '1',
>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
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
<<<<<<< HEAD
=======
        subcontractorId: mockPayment.subcontractorId,
>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
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

<<<<<<< HEAD
      const result = await service.findSubcontractorPaymentsInMonth({
=======
<<<<<<< HEAD
      const result = await service.findAll({
>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
        month: '2023-01',
      });

<<<<<<< HEAD
=======
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
=======
      const result = await service.findSubcontractorPaymentsInMonth({
        month: '2023-01',
      });

>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
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
<<<<<<< HEAD
=======
>>>>>>> 97e54d2 (updated subcontractor payments to the new format requested)
>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
      });
    });

    it('should return an empty list if no payments found', async () => {
      mockPrismaService.subcontractor.findMany.mockResolvedValue([]);
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

<<<<<<< HEAD
      const result = await service.findSubcontractorPaymentsInMonth({
=======
<<<<<<< HEAD
      const result = await service.findAll({
>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
        month: '2023-03',
      });

      expect(result).toEqual([]);
<<<<<<< HEAD
=======
      expect(
        mockPrismaService.subcontractorPayment.findMany,
      ).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { serviceDate: '2023-03' },
      });
=======
      const result = await service.findSubcontractorPaymentsInMonth({
        month: '2023-03',
      });

      expect(result).toEqual([]);
>>>>>>> 97e54d2 (updated subcontractor payments to the new format requested)
>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
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
<<<<<<< HEAD
=======
        subcontractorId: '1',
>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
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
<<<<<<< HEAD
=======
        subcontractorId: mockPayment.subcontractorId,
>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
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
<<<<<<< HEAD
=======
<<<<<<< HEAD

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
=======
>>>>>>> 97e54d2 (updated subcontractor payments to the new format requested)
>>>>>>> 68b5d53 (updated subcontractor payments to the new format requested)
});
