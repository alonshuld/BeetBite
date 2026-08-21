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
import { VatRatesService } from 'src/vat-rates/vat-rates.service';

describe('CorporationPaymentsService', () => {
  let service: CorporationPaymentsService;

  const mockPrismaService = {
    corporationPayment: {
      create: jest.fn(),
      findCorporationsPaymentsInMonth: jest.fn(),
      findCorporationMonthlyPayments: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    corporation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockVatRatesService = {
    resolveForMonth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporationPaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: VatRatesService,
          useValue: mockVatRatesService,
        },
      ],
    }).compile();

    service = module.get<CorporationPaymentsService>(
      CorporationPaymentsService,
    );

    jest.clearAllMocks();
    mockVatRatesService.resolveForMonth.mockResolvedValue(18);
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
      isFuture: false,
    };

    const mockPayment = {
      id: 'payment-1',
      amount: {
        toNumber: () => 1000,
      },
      date: new Date('2023-01-01'),
      description: null,
      isFuture: false,
      vatPercentage: null,
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
        description: null,
        isFuture: false,
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 1000,
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
        data: {
          ...createDto,
          date: new Date(createDto.date),
          vatPercentage: 18,
        },
        select: {
          id: true,
          amount: true,
          date: true,
          description: true,
          isFuture: true,
          vatPercentage: true,
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
      expect(mockVatRatesService.resolveForMonth).toHaveBeenCalledWith(
        createDto.date,
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

    it('should default vatPercentage to the resolved VAT rate when not future and no VAT is supplied', async () => {
      mockPrismaService.corporationPayment.create.mockResolvedValue(
        mockPayment,
      );
      mockVatRatesService.resolveForMonth.mockResolvedValue(20);

      await service.create({ ...createDto, isFuture: false });

      expect(mockPrismaService.corporationPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vatPercentage: 20 }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('should leave vatPercentage undefined when no VAT rate has ever been configured', async () => {
      mockPrismaService.corporationPayment.create.mockResolvedValue(
        mockPayment,
      );
      mockVatRatesService.resolveForMonth.mockResolvedValue(null);

      await service.create({ ...createDto, isFuture: false });

      expect(mockPrismaService.corporationPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vatPercentage: undefined }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('should NOT default vatPercentage for a future payment', async () => {
      mockPrismaService.corporationPayment.create.mockResolvedValue({
        ...mockPayment,
        isFuture: true,
      });

      await service.create({ ...createDto, isFuture: true });

      expect(mockPrismaService.corporationPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vatPercentage: undefined }) as Record<
            string,
            unknown
          >,
        }),
      );
      expect(mockVatRatesService.resolveForMonth).not.toHaveBeenCalled();
    });

    it('should preserve an explicitly supplied vatPercentage instead of overriding it with 18', async () => {
      mockPrismaService.corporationPayment.create.mockResolvedValue(
        mockPayment,
      );

      await service.create({ ...createDto, isFuture: false, vatPercentage: 9 });

      expect(mockPrismaService.corporationPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vatPercentage: 9 }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('should preserve an explicit vatPercentage of 0 (not treat it as missing)', async () => {
      mockPrismaService.corporationPayment.create.mockResolvedValue(
        mockPayment,
      );

      await service.create({ ...createDto, isFuture: false, vatPercentage: 0 });

      expect(mockPrismaService.corporationPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vatPercentage: 0 }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('should expose computed vatAmount and effectiveTotal in the response', async () => {
      mockPrismaService.corporationPayment.create.mockResolvedValue({
        ...mockPayment,
        amount: { toNumber: () => 1000 },
        vatPercentage: { toNumber: () => 18 },
      });

      const result = await service.create(createDto);

      expect(result.vatPercentage).toBe(18);
      expect(result.vatAmount).toBeCloseTo(180); // 1000 * 18%
      expect(result.effectiveTotal).toBeCloseTo(1180);
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
          vatPercentage: null,
          isFuture: false,
          description: null,
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
          vatPercentage: null,
          isFuture: false,
          description: null,
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

      mockPrismaService.corporation.findUnique.mockResolvedValue({
        id: 'corp-1',
        name: 'Corp 1',
        payments: payments,
      });

      const result = await service.findCorporationMonthlyPayments(
        'corp-1',
        monthQueryDto,
      );

      expect(result).toEqual({
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
            vatPercentage: null,
            vatAmount: 0,
            effectiveTotal: 1000,
            isFuture: false,
            description: null,
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
            vatPercentage: null,
            vatAmount: 0,
            effectiveTotal: 500,
            isFuture: false,
            description: null,
          },
        ],
        total: 1500,
      });
      expect(mockPrismaService.corporation.findUnique).toHaveBeenCalledWith({
        where: { id: 'corp-1' },
        select: {
          id: true,
          name: true,
          payments: {
            where: {
              projectReport: {
                date: {
                  gte: new Date('2023-01-01T00:00:00.000Z'),
                  lte: new Date('2023-01-31T00:00:00.000Z'),
                },
              },
            },
            select: {
              id: true,
              amount: true,
              date: true,
              vatPercentage: true,
              isFuture: true,
              description: true,
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
            },
          },
        },
      });
    });

    it('should throw error when corporation not found', async () => {
      mockPrismaService.corporation.findUnique.mockResolvedValue(null);

      await expect(
        service.findCorporationMonthlyPayments('corp-1', monthQueryDto),
      ).rejects.toThrow('Corporation with ID corp-1 not found');
    });
  });

  describe('findAll', () => {
    const paginatedMonthQueryDto: PaginatedMonthQueryDto = {
      month: '2023-01-01T00:00:00.000Z',
      page: 1,
      limit: 10,
    };

    it('should return all corporations payments for a month', async () => {
      const corporations = [
        {
          id: 'corp-1',
          name: 'Corp 1',
          payments: [
            {
              id: 'payment-1',
              amount: { toNumber: (): number => 1000 },
              date: new Date('2023-01-10'),
              vatPercentage: null,
              isFuture: false,
              description: null,
              projectReportId: 'report-1',
              projectReport: {
                id: 'report-1',
                projectId: 'project-1',
                project: {
                  id: 'project-1',
                  name: 'Project 1',
                },
              },
            },
          ],
        },
        {
          id: 'corp-2',
          name: 'Corp 2',
          payments: [
            {
              id: 'payment-2',
              amount: { toNumber: (): number => 500 },
              date: new Date('2023-01-20'),
              vatPercentage: null,
              isFuture: false,
              description: null,
              projectReportId: 'report-2',
              projectReport: {
                id: 'report-2',
                projectId: 'project-2',
                project: {
                  id: 'project-2',
                  name: 'Project 2',
                },
              },
            },
          ],
        },
      ];

      mockPrismaService.corporation.findMany.mockResolvedValue(corporations);

      const result = await service.findCorporationsPaymentsInMonth(
        paginatedMonthQueryDto,
      );

      expect(result.total).toBe(1500);
      expect(result.corporationsPayments).toHaveLength(2);
      expect(mockPrismaService.corporation.findMany).toHaveBeenCalledWith({
        where: {
          payments: {
            some: {
              projectReport: {
                date: {
                  gte: new Date('2023-01-01T00:00:00.000Z'),
                  lte: new Date('2023-01-31T00:00:00.000Z'),
                },
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          payments: {
            where: {
              projectReport: {
                date: {
                  gte: new Date('2023-01-01T00:00:00.000Z'),
                  lte: new Date('2023-01-31T00:00:00.000Z'),
                },
              },
            },
            select: {
              id: true,
              amount: true,
              date: true,
              vatPercentage: true,
              isFuture: true,
              description: true,
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

      mockPrismaService.corporation.findMany.mockRejectedValue(prismaError);

      await expect(
        service.findCorporationsPaymentsInMonth(paginatedMonthQueryDto),
      ).rejects.toThrow(PrismaClientKnownRequestError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCorporationPaymentDto = {
      corporationId: 'corp-1',
      projectReportId: 'report-1',
      amount: 1500,
      date: '2023-01-15T00:00:00.000Z',
      isFuture: false,
    };

    const mockUpdatedPayment = {
      id: 'payment-1',
      amount: {
        toNumber: () => 1500,
      },
      date: new Date('2023-01-15'),
      description: null,
      isFuture: false,
      vatPercentage: null,
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
        description: null,
        isFuture: false,
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 1500,
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
        data: {
          ...updateDto,
          date: new Date(updateDto.date),
          vatPercentage: 18,
        },
        select: {
          id: true,
          amount: true,
          date: true,
          description: true,
          isFuture: true,
          vatPercentage: true,
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
      expect(mockVatRatesService.resolveForMonth).toHaveBeenCalledWith(
        updateDto.date,
      );
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
