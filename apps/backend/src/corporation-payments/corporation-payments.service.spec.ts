import { Test, TestingModule } from '@nestjs/testing';
import { CorporationPaymentsService } from './corporation-payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { CorporationPaymentNotFoundError } from './errors/corporation-payment-not-found.error';
import { CorporationPaymentAlreadyExistsError } from './errors/corporation-payment-already-exists.error';
import { CreateCorporationPaymentDto } from './dto/create-corporation-payment.dto';
import { UpdateCorporationPaymentDto } from './dto/update-corporation-payment.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';

describe('CorporationPaymentsService', () => {
  let service: CorporationPaymentsService;

  const mockPrismaService = {
    corporationPayment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporationPaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CorporationPaymentsService>(
      CorporationPaymentsService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCorporationPaymentDto = {
      corporationId: 'corp-1',
      projectReportId: 'report-1',
      amount: 1000,
      date: '2023-01-01T00:00:00.000Z',
    };

    const mockPayment = {
      id: 'payment-1',
      amount: {
        toNumber: () => 1000,
      },
      date: new Date('2023-01-01'),
      projectReportId: 'report-1',
      corporationId: 'corp-1',
      corporation: {
        id: 'corp-1',
        name: 'Corp 1',
      },
      projectReport: {
        id: 'report-1',
        projectId: 'project-1',
        project: {
          id: 'project-1',
          name: 'Project 1',
        },
      },
    };

    it('should create a corporation payment', async () => {
      mockPrismaService.corporationPayment.create.mockResolvedValue(
        mockPayment,
      );

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockPayment.id,
        amount: 1000,
        date: mockPayment.date.toISOString(),
        projectReport: {
          id: mockPayment.projectReport.id,
          projectId: mockPayment.projectReport.projectId,
          projectName: mockPayment.projectReport.project.name,
        },
        corporation: {
          id: mockPayment.corporation.id,
          name: mockPayment.corporation.name,
        },
      });
      expect(mockPrismaService.corporationPayment.create).toHaveBeenCalledWith({
        data: createDto,
        select: {
          id: true,
          amount: true,
          date: true,
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
    });

    it('should throw CorporationPaymentNotFoundError on foreign key error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.corporationPayment.create.mockRejectedValue(
        prismaError,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        EntityNotFoundError,
      );
    });

    it('should throw CorporationPaymentAlreadyExistsError on unique constraint error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.corporationPayment.create.mockRejectedValue(
        prismaError,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        CorporationPaymentAlreadyExistsError,
      );
    });
  });

  describe('findOne', () => {
    const monthQueryDto: MonthQueryDto = { month: '2023-01-01T00:00:00.000Z' };

    it('should return corporation payments for a corporation and month', async () => {
      const payments = [
        {
          id: 'payment-1',
          amount: { toNumber: () => 1000 },
          date: new Date('2023-01-10'),
          projectReportId: 'report-1',
          corporationId: 'corp-1',
          corporation: {
            id: 'corp-1',
            name: 'Corp 1',
          },
          projectReport: {
            id: 'report-1',
            projectId: 'project-1',
            project: {
              id: 'project-1',
              name: 'Project 1',
            },
          },
        },
        {
          id: 'payment-2',
          amount: { toNumber: () => 500 },
          date: new Date('2023-01-20'),
          projectReportId: 'report-2',
          corporationId: 'corp-1',
          corporation: {
            id: 'corp-1',
            name: 'Corp 1',
          },
          projectReport: {
            id: 'report-2',
            projectId: 'project-2',
            project: {
              id: 'project-2',
              name: 'Project 2',
            },
          },
        },
      ];

      mockPrismaService.corporationPayment.findMany.mockResolvedValue(payments);

      const result = await service.findOne('corp-1', monthQueryDto);

      expect(result).toEqual({
        id: 'corp-1',
        corporation: {
          id: 'corp-1',
          name: 'Corp 1',
        },
        projectPayments: [
          {
            id: 'payment-1',
            projectReport: {
              id: 'report-1',
              projectId: 'project-1',
              projectName: 'Project 1',
            },
            amount: 1000,
            date: payments[0].date.toISOString(),
          },
          {
            id: 'payment-2',
            projectReport: {
              id: 'report-2',
              projectId: 'project-2',
              projectName: 'Project 2',
            },
            amount: 500,
            date: payments[1].date.toISOString(),
          },
        ],
        total: 1500,
      });
      expect(
        mockPrismaService.corporationPayment.findMany,
      ).toHaveBeenCalledWith({
        where: {
          corporationId: 'corp-1',
          date: {
            gte: new Date('2023-01-01T00:00:00.000Z'),
            lte: new Date('2023-01-31T00:00:00.000Z'),
          },
        },
        select: {
          id: true,
          amount: true,
          date: true,
          projectReportId: true,
          corporationId: true,
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
          corporation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should throw CorporationPaymentNotFoundError on foreign key error', async () => {
      const error = new CorporationPaymentNotFoundError('corp-1');

      mockPrismaService.corporationPayment.findMany.mockRejectedValue(error);

      await expect(service.findOne('corp-1', monthQueryDto)).rejects.toThrow(
        error,
      );
    });
  });

  describe('findAll', () => {
    const paginatedMonthQueryDto: PaginatedMonthQueryDto = {
      month: '2023-01-01T00:00:00.000Z',
      page: 1,
      limit: 10,
    };

    it('should return all corporations payments for a month', async () => {
      const payments = [
        {
          id: 'payment-1',
          amount: { toNumber: () => 1000 },
          date: new Date('2023-01-10'),
          projectReportId: 'report-1',
          corporationId: 'corp-1',
          corporation: {
            id: 'corp-1',
            name: 'Corp 1',
          },
          projectReport: {
            id: 'report-1',
            projectId: 'project-1',
            project: {
              id: 'project-1',
              name: 'Project 1',
            },
          },
        },
        {
          id: 'payment-2',
          amount: { toNumber: () => 500 },
          date: new Date('2023-01-20'),
          projectReportId: 'report-2',
          corporationId: 'corp-2',
          corporation: {
            id: 'corp-2',
            name: 'Corp 2',
          },
          projectReport: {
            id: 'report-2',
            projectId: 'project-2',
            project: {
              id: 'project-2',
              name: 'Project 2',
            },
          },
        },
      ];

      mockPrismaService.corporationPayment.findMany.mockResolvedValue(payments);

      const result = await service.findCorporationPaymentsInMonth(
        paginatedMonthQueryDto,
      );

      expect(result.total).toBe(1500);
      expect(result.corporationsPayments).toHaveLength(2);
      expect(
        mockPrismaService.corporationPayment.findMany,
      ).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          date: {
            gte: new Date('2023-01-01T00:00:00.000Z'),
            lte: new Date('2023-01-31T00:00:00.000Z'),
          },
        },
        select: {
          id: true,
          amount: true,
          date: true,
          projectReportId: true,
          corporationId: true,
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
          corporation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should throw CorporationPaymentNotFoundError on foreign key error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.corporationPayment.findMany.mockRejectedValue(
        prismaError,
      );

      await expect(
        service.findCorporationPaymentsInMonth(paginatedMonthQueryDto),
      ).rejects.toThrow(CorporationPaymentNotFoundError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCorporationPaymentDto = {
      corporationId: 'corp-1',
      projectReportId: 'report-1',
      amount: 1500,
      date: '2023-01-15T00:00:00.000Z',
    };

    const mockUpdatedPayment = {
      id: 'payment-1',
      amount: {
        toNumber: () => 1500,
      },
      date: new Date('2023-01-15'),
      projectReportId: 'report-1',
      corporationId: 'corp-1',
      corporation: {
        id: 'corp-1',
        name: 'Corp 1',
      },
      projectReport: {
        id: 'report-1',
        projectId: 'project-1',
        project: {
          id: 'project-1',
          name: 'Project 1',
        },
      },
    };

    it('should update a corporation payment', async () => {
      mockPrismaService.corporationPayment.update.mockResolvedValue(
        mockUpdatedPayment,
      );

      const result = await service.update('payment-1', updateDto);

      expect(result).toEqual({
        id: mockUpdatedPayment.id,
        amount: 1500,
        date: mockUpdatedPayment.date.toISOString(),
        projectReport: {
          id: mockUpdatedPayment.projectReport.id,
          projectId: mockUpdatedPayment.projectReport.projectId,
          projectName: mockUpdatedPayment.projectReport.project.name,
        },
        corporation: {
          id: mockUpdatedPayment.corporation.id,
          name: mockUpdatedPayment.corporation.name,
        },
      });
      expect(mockPrismaService.corporationPayment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: updateDto,
        select: {
          id: true,
          amount: true,
          date: true,
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
    });

    it('should throw CorporationPaymentNotFoundError on not found error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record to update does not exist.',
        {
          code: PRISMA_ERROR_CODES.NOT_FOUND,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.corporationPayment.update.mockRejectedValue(
        prismaError,
      );

      await expect(service.update('payment-1', updateDto)).rejects.toThrow(
        CorporationPaymentNotFoundError,
      );
    });

    it('should throw CorporationPaymentNotFoundError on foreign key error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.corporationPayment.update.mockRejectedValue(
        prismaError,
      );

      await expect(service.update('payment-1', updateDto)).rejects.toThrow(
        EntityNotFoundError,
      );
    });

    it('should throw CorporationPaymentAlreadyExistsError on unique constraint error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.corporationPayment.update.mockRejectedValue(
        prismaError,
      );

      await expect(service.update('payment-1', updateDto)).rejects.toThrow(
        CorporationPaymentAlreadyExistsError,
      );
    });
  });

  describe('remove', () => {
    it('should remove a corporation payment', async () => {
      mockPrismaService.corporationPayment.delete.mockResolvedValue({});

      await expect(service.remove('payment-1')).resolves.toBeUndefined();

      expect(mockPrismaService.corporationPayment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      });
    });

    it('should throw CorporationPaymentNotFoundError on not found error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record to delete does not exist.',
        {
          code: PRISMA_ERROR_CODES.NOT_FOUND,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.corporationPayment.delete.mockRejectedValue(
        prismaError,
      );

      await expect(service.remove('payment-1')).rejects.toThrow(
        CorporationPaymentNotFoundError,
      );
    });
  });
});
