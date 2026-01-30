import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubcontractorPaymentNotFoundError } from './errors/subcontractor-payment-not-found.error';
import { SubcontractorPaymentAlreadyExistsError } from './errors/subcontractor-payment-already-exists.error';
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
      subcontractorId: '1',
      serviceDate: new Date('2023-01'),
      paymentDate: new Date('2023-01'),
    };

    it('should create a subcontractor payment', async () => {
      mockPrismaService.subcontractorPayment.create.mockResolvedValue(
        mockPayment,
      );

      const result = await service.create(createDto);

      expect(result).toEqual({
        subcontractorId: mockPayment.subcontractorId,
        serviceDate: mockPayment.serviceDate.toISOString(),
        paymentDate: mockPayment.paymentDate.toISOString(),
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
          subcontractorId: '1',
          serviceDate: new Date('2023-01'),
          paymentDate: new Date('2023-01'),
        },
        {
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
      });

      expect(result).toEqual(
        mockPayments.map((payment) => ({
          subcontractorId: payment.subcontractorId,
          serviceDate: payment.serviceDate.toISOString(),
          paymentDate: payment.paymentDate.toISOString(),
        })),
      );
      expect(
        mockPrismaService.subcontractorPayment.findMany,
      ).toHaveBeenCalled();
    });

    it('should return an empty list if no payments found', async () => {
      mockPrismaService.subcontractorPayment.findMany.mockResolvedValue([]);

      const result = await service.findAll({
        month: '2023-03',
      });

      expect(result).toEqual([]);
      expect(
        mockPrismaService.subcontractorPayment.findMany,
      ).toHaveBeenCalled();
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

      const result = await service.findOne('1');

      expect(result).toEqual({
        id: mockPayment.id,
        subcontractorId: mockPayment.subcontractorId,
        serviceDate: mockPayment.serviceDate.toISOString(),
        paymentDate: mockPayment.paymentDate.toISOString(),
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

      const result = await service.update('1', updateDto);

      expect(result).toEqual({
        id: mockPayment.id,
        subcontractorId: mockPayment.subcontractorId,
        serviceDate: mockPayment.serviceDate.toISOString(),
        paymentDate: mockPayment.paymentDate.toISOString(),
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

      await service.remove('1');

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
});
