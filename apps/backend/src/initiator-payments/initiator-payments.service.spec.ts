import { Test, TestingModule } from '@nestjs/testing';
import { InitiatorPaymentsService } from './initiator-payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { InitiatorPaymentNotFoundError } from './errors/initiator-payment-not-found.error';
import { InitiatorNotFoundError } from 'src/initiators/errors/initiator-not-found.error';
import { ProjectReportNotFoundError } from 'src/project-reports/errors/project-report-not-found.exception';
import { CreateInitiatorPaymentDto } from './dto/create-initiator-payment.dto';
import { UpdateInitiatorPaymentDto } from './dto/update-initiator-payment.dto';

describe('InitiatorPaymentsService', () => {
  let service: InitiatorPaymentsService;

  const mockPrismaService = {
    initiatorPayment: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InitiatorPaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InitiatorPaymentsService>(InitiatorPaymentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateInitiatorPaymentDto = {
      projectReportId: 'report-1',
      initiatorId: 'initiator-1',
      amount: 5000,
      date: '2026-01-10',
      description: 'Consulting fee',
    };

    it('should create an initiator payment', async () => {
      const mockPayment = {
        id: 'payment-1',
        projectReportId: 'report-1',
        amount: new Prisma.Decimal(5000),
        date: new Date('2026-01-10'),
        description: 'Consulting fee',
        initiator: { id: 'initiator-1', name: 'Yaniv Goldman' },
      };
      mockPrismaService.initiatorPayment.create.mockResolvedValue(mockPayment);

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: 'payment-1',
        projectReportId: 'report-1',
        amount: 5000,
        date: mockPayment.date.toISOString(),
        description: 'Consulting fee',
        initiator: { id: 'initiator-1', name: 'Yaniv Goldman' },
      });
    });

    it('should throw ProjectReportNotFoundError on a bad projectReportId FK', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
        meta: { field_name: 'InitiatorPayment_projectReportId_fkey' },
      });
      mockPrismaService.initiatorPayment.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });

    it('should throw InitiatorNotFoundError on a bad initiatorId FK', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '1.0.0',
        meta: { field_name: 'InitiatorPayment_initiatorId_fkey' },
      });
      mockPrismaService.initiatorPayment.create.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(
        InitiatorNotFoundError,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateInitiatorPaymentDto = {
      projectReportId: 'report-1',
      initiatorId: 'initiator-1',
      amount: 7000,
      date: '2026-02-01',
    };

    it('should update an initiator payment', async () => {
      const mockPayment = {
        id: 'payment-1',
        projectReportId: 'report-1',
        amount: new Prisma.Decimal(7000),
        date: new Date('2026-02-01'),
        description: null,
        initiator: { id: 'initiator-1', name: 'Yaniv Goldman' },
      };
      mockPrismaService.initiatorPayment.update.mockResolvedValue(mockPayment);

      const result = await service.update('payment-1', updateDto);

      expect(result.amount).toBe(7000);
    });

    it('should throw InitiatorPaymentNotFoundError when payment not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.initiatorPayment.update.mockRejectedValue(error);

      await expect(service.update('payment-1', updateDto)).rejects.toThrow(
        InitiatorPaymentNotFoundError,
      );
    });
  });

  describe('remove', () => {
    it('should delete an initiator payment', async () => {
      mockPrismaService.initiatorPayment.delete.mockResolvedValue({
        id: 'payment-1',
      });

      const result = await service.remove('payment-1');

      expect(result).toBeUndefined();
    });

    it('should throw InitiatorPaymentNotFoundError when payment not found', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '1.0.0',
      });
      mockPrismaService.initiatorPayment.delete.mockRejectedValue(error);

      await expect(service.remove('payment-1')).rejects.toThrow(
        InitiatorPaymentNotFoundError,
      );
    });
  });
});
