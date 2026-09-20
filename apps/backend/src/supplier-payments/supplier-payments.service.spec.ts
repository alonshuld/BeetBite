import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentsService } from './supplier-payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { SupplierPaymentNotFoundError } from './errors/supplier-payment-not-found.error';
import { SupplierPaymentAlreadyExistsError } from './errors/supplier-payment-already-exists.error';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { Prisma } from 'src/generated/client';

describe('SupplierPaymentsService', () => {
  let service: SupplierPaymentsService;

  const mockPrismaService = {
    supplierPayment: {
      create: jest.fn(),
      findSuppliersPaymentsInMonth: jest.fn(),
      findSupplierMonthlyPayments: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockVatRatesService = {
    findAllEntries: jest.fn(),
  };

  const vatRate = (effectiveMonth: string, percentage: string) => ({
    effectiveMonth: new Date(effectiveMonth),
    percentage: new Prisma.Decimal(percentage),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierPaymentsService,
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

    service = module.get<SupplierPaymentsService>(SupplierPaymentsService);

    jest.clearAllMocks();
    mockVatRatesService.findAllEntries.mockResolvedValue([]);
    // Run transaction callbacks against the same mock.
    mockPrismaService.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrismaService) => unknown) =>
        callback(mockPrismaService),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateSupplierPaymentDto = {
      supplierId: 'corp-1',
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
      includesVat: false,
      projectReportId: 'report-1',
      supplierId: 'corp-1',
      supplier: {
        id: 'corp-1',
        name: 'Corp 1',
      },
      projectReport: {
        id: 'report-1',
        date: new Date('2023-01-01T00:00:00.000Z'),
        projectId: 'project-1',
        project: {
          id: 'project-1',
          name: 'Project 1',
        },
      },
    };

    it('should create a supplier payment', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue(mockPayment);

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: mockPayment.id,
        amount: 1000,
        date: mockPayment.date.toISOString(),
        description: null,
        isFuture: false,
        includesVat: false,
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 1000,
        projectReport: {
          id: mockPayment.projectReport.id,
          projectId: mockPayment.projectReport.projectId,
          projectName: mockPayment.projectReport.project.name,
        },
        supplier: {
          id: mockPayment.supplier.id,
          name: mockPayment.supplier.name,
        },
      });
      expect(mockPrismaService.supplierPayment.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          date: new Date(createDto.date),
          includesVat: true,
        },
        select: {
          id: true,
          amount: true,
          date: true,
          description: true,
          isFuture: true,
          includesVat: true,
          isPaid: true,
          projectReportId: true,
          supplierId: true,
          projectReport: {
            select: {
              id: true,
              date: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should throw SupplierPaymentNotFoundError on foreign key error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.supplierPayment.create.mockRejectedValue(prismaError);

      await expect(service.create(createDto)).rejects.toThrow(
        EntityNotFoundError,
      );
    });

    it('should throw SupplierPaymentAlreadyExistsError on unique constraint error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.supplierPayment.create.mockRejectedValue(prismaError);

      await expect(service.create(createDto)).rejects.toThrow(
        SupplierPaymentAlreadyExistsError,
      );
    });

    it('charges VAT by default when includesVat is not stated', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue(mockPayment);

      await service.create({ ...createDto, isFuture: false });

      expect(mockPrismaService.supplierPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ includesVat: true }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('does not charge VAT by default on a future payment', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue({
        ...mockPayment,
        isFuture: true,
      });

      await service.create({ ...createDto, isFuture: true });

      expect(mockPrismaService.supplierPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ includesVat: false }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('respects an explicit includesVat: false', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue(mockPayment);

      await service.create({ ...createDto, includesVat: false });

      expect(mockPrismaService.supplierPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ includesVat: false }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('respects an explicit includesVat: true even on a future payment', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue(mockPayment);

      await service.create({ ...createDto, isFuture: true, includesVat: true });

      expect(mockPrismaService.supplierPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ includesVat: true }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('never stores a VAT percentage', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue(mockPayment);

      await service.create(createDto);

      const [{ data }] = mockPrismaService.supplierPayment.create.mock
        .calls[0] as [{ data: Record<string, unknown> }];
      expect(data).not.toHaveProperty('vatPercentage');
    });

    it("derives vatAmount and effectiveTotal from the global rate for the report's month", async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue({
        ...mockPayment,
        includesVat: true,
      });
      mockVatRatesService.findAllEntries.mockResolvedValue([
        vatRate('2022-01-01T00:00:00.000Z', '17'),
        vatRate('2023-01-01T00:00:00.000Z', '18'),
      ]);

      const result = await service.create(createDto);

      expect(result.includesVat).toBe(true);
      expect(result.vatPercentage).toBe(18);
      expect(result.vatAmount).toBeCloseTo(180); // 1000 * 18%
      expect(result.effectiveTotal).toBeCloseTo(1180);
    });

    it('adds no VAT when it is included but no rate is configured yet', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue({
        ...mockPayment,
        includesVat: true,
      });

      const result = await service.create(createDto);

      expect(result.includesVat).toBe(true);
      expect(result.vatPercentage).toBeNull();
      expect(result.vatAmount).toBe(0);
      expect(result.effectiveTotal).toBe(1000);
    });
  });

  describe('findOne', () => {
    const monthQueryDto: MonthQueryDto = { month: '2023-01-01T00:00:00.000Z' };

    it('should return supplier payments for a supplier and month', async () => {
      const payments = [
        {
          id: 'payment-1',
          amount: { toNumber: () => 1000 },
          date: new Date('2023-01-10'),
          includesVat: false,
          isFuture: false,
          description: null,
          isPaid: false,
          supplier: {
            id: 'corp-1',
            name: 'Corp 1',
          },
          projectReport: {
            id: 'report-1',
            date: new Date('2023-01-01T00:00:00.000Z'),
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
          includesVat: false,
          isFuture: false,
          description: null,
          isPaid: false,
          projectReportId: 'report-2',
          supplierId: 'corp-1',
          supplier: {
            id: 'corp-1',
            name: 'Corp 1',
          },
          projectReport: {
            id: 'report-2',
            date: new Date('2023-01-01T00:00:00.000Z'),
            projectId: 'project-2',
            project: {
              id: 'project-2',
              name: 'Project 2',
            },
          },
        },
      ];

      mockPrismaService.supplier.findUnique.mockResolvedValue({
        id: 'corp-1',
        name: 'Corp 1',
        payments: payments,
      });

      const result = await service.findSupplierMonthlyPayments(
        'corp-1',
        monthQueryDto,
      );

      expect(result).toEqual({
        supplier: {
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
            includesVat: false,
            vatPercentage: null,
            vatAmount: 0,
            effectiveTotal: 1000,
            isFuture: false,
            description: null,
            isPaid: false,
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
            includesVat: false,
            vatPercentage: null,
            vatAmount: 0,
            effectiveTotal: 500,
            isFuture: false,
            description: null,
            isPaid: false,
          },
        ],
        total: 1500,
        totalPaid: 0,
      });
      expect(mockPrismaService.supplier.findUnique).toHaveBeenCalledWith({
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
              includesVat: true,
              isFuture: true,
              description: true,
              isPaid: true,
              projectReport: {
                select: {
                  id: true,
                  date: true,
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

    it("derives each payment's VAT from the rate for its report's month", async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue({
        id: 'corp-1',
        name: 'Corp 1',
        payments: [
          {
            id: 'with-vat',
            amount: { toNumber: () => 1000 },
            date: new Date('2023-01-10'),
            includesVat: true,
            isFuture: false,
            description: null,
            isPaid: false,
            projectReport: {
              id: 'report-1',
              date: new Date('2023-01-01T00:00:00.000Z'),
              project: { id: 'project-1', name: 'Project 1' },
            },
          },
          {
            id: 'without-vat',
            amount: { toNumber: () => 500 },
            date: new Date('2023-01-20'),
            includesVat: false,
            isFuture: false,
            description: null,
            isPaid: false,
            projectReport: {
              id: 'report-2',
              date: new Date('2023-01-01T00:00:00.000Z'),
              project: { id: 'project-2', name: 'Project 2' },
            },
          },
        ],
      });
      mockVatRatesService.findAllEntries.mockResolvedValue([
        vatRate('2022-06-01T00:00:00.000Z', '17'),
        vatRate('2023-01-01T00:00:00.000Z', '18'),
        vatRate('2023-09-01T00:00:00.000Z', '19'),
      ]);

      const result = await service.findSupplierMonthlyPayments(
        'corp-1',
        monthQueryDto,
      );

      expect(result.projectPayments[0]).toMatchObject({
        id: 'with-vat',
        includesVat: true,
        vatPercentage: 18,
        vatAmount: 180,
        effectiveTotal: 1180,
      });
      expect(result.projectPayments[1]).toMatchObject({
        id: 'without-vat',
        includesVat: false,
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 500,
      });
      // The rate history is read once for the whole listing, not per row.
      expect(mockVatRatesService.findAllEntries).toHaveBeenCalledTimes(1);
    });

    it('should throw error when supplier not found', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(
        service.findSupplierMonthlyPayments('corp-1', monthQueryDto),
      ).rejects.toThrow('Supplier with ID corp-1 not found');
    });
  });

  describe('findAll', () => {
    const paginatedMonthQueryDto: PaginatedMonthQueryDto = {
      month: '2023-01-01T00:00:00.000Z',
      page: 1,
      limit: 10,
    };

    it('should return all suppliers payments for a month', async () => {
      const suppliers = [
        {
          id: 'corp-1',
          name: 'Corp 1',
          payments: [
            {
              id: 'payment-1',
              amount: { toNumber: (): number => 1000 },
              date: new Date('2023-01-10'),
              includesVat: false,
              isFuture: false,
              description: null,
              projectReportId: 'report-1',
              projectReport: {
                id: 'report-1',
                date: new Date('2023-01-01T00:00:00.000Z'),
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
              includesVat: false,
              isFuture: false,
              description: null,
              projectReportId: 'report-2',
              projectReport: {
                id: 'report-2',
                date: new Date('2023-01-01T00:00:00.000Z'),
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

      mockPrismaService.supplier.findMany.mockResolvedValue(suppliers);

      const result = await service.findSuppliersPaymentsInMonth(
        paginatedMonthQueryDto,
      );

      expect(result.total).toBe(1500);
      expect(result.suppliersPayments).toHaveLength(2);
      expect(mockPrismaService.supplier.findMany).toHaveBeenCalledWith({
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
              includesVat: true,
              isFuture: true,
              description: true,
              isPaid: true,
              projectReport: {
                select: {
                  id: true,
                  date: true,
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

    it('should throw SupplierPaymentNotFoundError on foreign key error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.supplier.findMany.mockRejectedValue(prismaError);

      await expect(
        service.findSuppliersPaymentsInMonth(paginatedMonthQueryDto),
      ).rejects.toThrow(PrismaClientKnownRequestError);
    });
  });

  describe('update', () => {
    const updateDto: UpdateSupplierPaymentDto = {
      supplierId: 'corp-1',
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
      includesVat: false,
      projectReportId: 'report-1',
      supplierId: 'corp-1',
      supplier: {
        id: 'corp-1',
        name: 'Corp 1',
      },
      projectReport: {
        id: 'report-1',
        date: new Date('2023-01-01T00:00:00.000Z'),
        projectId: 'project-1',
        project: {
          id: 'project-1',
          name: 'Project 1',
        },
      },
    };

    it('should update a supplier payment', async () => {
      mockPrismaService.supplierPayment.update.mockResolvedValue(
        mockUpdatedPayment,
      );

      const result = await service.update('payment-1', updateDto);

      expect(result).toEqual({
        id: mockUpdatedPayment.id,
        amount: 1500,
        date: mockUpdatedPayment.date.toISOString(),
        description: null,
        isFuture: false,
        includesVat: false,
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 1500,
        projectReport: {
          id: mockUpdatedPayment.projectReport.id,
          projectId: mockUpdatedPayment.projectReport.projectId,
          projectName: mockUpdatedPayment.projectReport.project.name,
        },
        supplier: {
          id: mockUpdatedPayment.supplier.id,
          name: mockUpdatedPayment.supplier.name,
        },
      });
      expect(mockPrismaService.supplierPayment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: {
          ...updateDto,
          date: new Date(updateDto.date),
        },
        select: {
          id: true,
          amount: true,
          date: true,
          description: true,
          isFuture: true,
          includesVat: true,
          isPaid: true,
          projectReportId: true,
          supplierId: true,
          projectReport: {
            select: {
              id: true,
              date: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    // Re-saving a payment (to fix its amount, say) must not silently switch its
    // VAT back on.
    it('leaves includesVat untouched when the update does not mention it', async () => {
      mockPrismaService.supplierPayment.update.mockResolvedValue(
        mockUpdatedPayment,
      );

      await service.update('payment-1', updateDto);

      const [{ data }] = mockPrismaService.supplierPayment.update.mock
        .calls[0] as [{ data: Record<string, unknown> }];
      expect(data).not.toHaveProperty('includesVat');
      expect(data).not.toHaveProperty('vatPercentage');
    });

    it('writes includesVat when the update states it', async () => {
      mockPrismaService.supplierPayment.update.mockResolvedValue(
        mockUpdatedPayment,
      );

      await service.update('payment-1', { ...updateDto, includesVat: false });

      expect(mockPrismaService.supplierPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ includesVat: false }) as Record<
            string,
            unknown
          >,
        }),
      );
    });

    it('should throw SupplierPaymentNotFoundError on not found error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record to update does not exist.',
        {
          code: PRISMA_ERROR_CODES.NOT_FOUND,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.supplierPayment.update.mockRejectedValue(prismaError);

      await expect(service.update('payment-1', updateDto)).rejects.toThrow(
        SupplierPaymentNotFoundError,
      );
    });

    it('should throw SupplierPaymentNotFoundError on foreign key error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.supplierPayment.update.mockRejectedValue(prismaError);

      await expect(service.update('payment-1', updateDto)).rejects.toThrow(
        EntityNotFoundError,
      );
    });

    it('should throw SupplierPaymentAlreadyExistsError on unique constraint error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.supplierPayment.update.mockRejectedValue(prismaError);

      await expect(service.update('payment-1', updateDto)).rejects.toThrow(
        SupplierPaymentAlreadyExistsError,
      );
    });
  });

  describe('remove', () => {
    it('should remove a supplier payment', async () => {
      mockPrismaService.supplierPayment.delete.mockResolvedValue({});

      await expect(service.remove('payment-1')).resolves.toBeUndefined();

      expect(mockPrismaService.supplierPayment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      });
    });

    it('should throw SupplierPaymentNotFoundError on not found error', async () => {
      const prismaError = new PrismaClientKnownRequestError(
        'Record to delete does not exist.',
        {
          code: PRISMA_ERROR_CODES.NOT_FOUND,
          clientVersion: '4.0.0',
        },
      );

      mockPrismaService.supplierPayment.delete.mockRejectedValue(prismaError);

      await expect(service.remove('payment-1')).rejects.toThrow(
        SupplierPaymentNotFoundError,
      );
    });
  });

  describe('createBatch', () => {
    const SUPPLIER_ID = 'supplier-1';
    const batchDto = {
      payments: [
        { projectReportId: 'report-1', amount: 1000, date: '2026-03-05' },
        { projectReportId: 'report-2', amount: 2000, date: '2026-03-06' },
        {
          projectReportId: 'report-3',
          amount: 3000,
          date: '2026-03-07',
          description: 'Invoice #77',
        },
      ],
    };

    function createdRow(id: string) {
      return {
        id,
        amount: { toNumber: () => 1000 },
        date: new Date('2026-03-05'),
        description: null,
        isFuture: false,
        includesVat: true,
        isPaid: false,
        projectReportId: 'report-1',
        supplierId: SUPPLIER_ID,
        projectReport: {
          id: 'report-1',
          date: new Date('2023-01-01T00:00:00.000Z'),
          projectId: 'project-1',
          project: { id: 'project-1', name: 'Project 1' },
        },
        supplier: { id: SUPPLIER_ID, name: 'Supplier 1' },
      };
    }

    beforeEach(() => {
      mockPrismaService.supplier.findUnique.mockResolvedValue({
        id: SUPPLIER_ID,
      });
    });

    it('records every line of the paperwork in one transaction', async () => {
      mockPrismaService.supplierPayment.create
        .mockResolvedValueOnce(createdRow('p1'))
        .mockResolvedValueOnce(createdRow('p2'))
        .mockResolvedValueOnce(createdRow('p3'));

      const result = await service.createBatch(SUPPLIER_ID, batchDto);

      expect(result).toHaveLength(3);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.supplierPayment.create).toHaveBeenCalledTimes(3);
    });

    // 🔴 The most important createBatch test. A stack half-recorded, with nothing to
    // say which half, is worse than a clean failure — so one bad row must
    // write nothing at all.
    it('writes nothing when any row is rejected', async () => {
      const fkError = new PrismaClientKnownRequestError('FK failed', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: 'test',
      });
      // The second line of the paperwork names a report that does not exist.
      mockPrismaService.supplierPayment.create
        .mockResolvedValueOnce(createdRow('p1'))
        .mockRejectedValueOnce(fkError);
      // The real transaction rolls back; the mock must not pretend otherwise.
      mockPrismaService.$transaction.mockImplementation(
        async (
          callback: (tx: typeof mockPrismaService) => Promise<unknown>,
        ) => {
          await callback(mockPrismaService);
          throw new Error('transaction should have rolled back');
        },
      );

      await expect(
        service.createBatch(SUPPLIER_ID, batchDto),
      ).rejects.toThrow();
    });

    it('charges VAT on every line by default', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue(
        createdRow('p1'),
      );

      await service.createBatch(SUPPLIER_ID, batchDto);

      for (const call of mockPrismaService.supplierPayment.create.mock
        .calls as [{ data: { includesVat: boolean } }][]) {
        expect(call[0].data.includesVat).toBe(true);
      }
    });

    it('honors a line that opts out of VAT', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue(
        createdRow('p1'),
      );

      await service.createBatch(SUPPLIER_ID, {
        payments: [
          { projectReportId: 'report-1', amount: 1000, date: '2026-03-05' },
          {
            projectReportId: 'report-2',
            amount: 2000,
            date: '2026-03-06',
            includesVat: false,
          },
        ],
      });

      const calls = mockPrismaService.supplierPayment.create.mock.calls as [
        { data: { projectReportId: string; includesVat: boolean } },
      ][];
      expect(calls.map(([{ data }]) => data.includesVat)).toEqual([
        true,
        false,
      ]);
    });

    it('derives the response VAT from the global rate history, loaded once', async () => {
      mockPrismaService.supplierPayment.create.mockResolvedValue(
        createdRow('p1'),
      );
      mockVatRatesService.findAllEntries.mockResolvedValue([
        vatRate('2022-01-01T00:00:00.000Z', '18'),
      ]);

      const result = await service.createBatch(SUPPLIER_ID, batchDto);

      expect(result[0]).toMatchObject({
        includesVat: true,
        vatPercentage: 18,
        vatAmount: 180,
        effectiveTotal: 1180,
      });
      expect(mockVatRatesService.findAllEntries).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown supplier before touching anything', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.createBatch('nope', batchDto)).rejects.toThrow();
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('includesVat flag', () => {
    const payment = {
      id: 'p1',
      amount: { toNumber: () => 1000 },
      date: new Date('2023-01-05'),
      description: null,
      isFuture: false,
      includesVat: true,
      isPaid: false,
      projectReportId: 'report-1',
      supplierId: 'supplier-1',
      projectReport: {
        id: 'report-1',
        projectId: 'project-1',
        date: new Date('2023-01-01T00:00:00.000Z'),
        project: { id: 'project-1', name: 'Project 1' },
      },
      supplier: { id: 'supplier-1', name: 'Supplier 1' },
    };

    it('writes only the choice, never a percentage', async () => {
      mockPrismaService.supplierPayment.update.mockResolvedValue(payment);

      await service.setIncludesVat('p1', { includesVat: true });

      expect(mockPrismaService.supplierPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: { includesVat: true },
        }) as unknown,
      );
    });

    it("returns the payment with VAT derived for its report's month", async () => {
      mockPrismaService.supplierPayment.update.mockResolvedValue(payment);
      mockVatRatesService.findAllEntries.mockResolvedValue([
        vatRate('2023-01-01T00:00:00.000Z', '18'),
      ]);

      const result = await service.setIncludesVat('p1', { includesVat: true });

      expect(result).toMatchObject({
        id: 'p1',
        includesVat: true,
        vatPercentage: 18,
        vatAmount: 180,
        effectiveTotal: 1180,
      });
    });

    it('turns VAT off', async () => {
      mockPrismaService.supplierPayment.update.mockResolvedValue({
        ...payment,
        includesVat: false,
      });
      mockVatRatesService.findAllEntries.mockResolvedValue([
        vatRate('2023-01-01T00:00:00.000Z', '18'),
      ]);

      const result = await service.setIncludesVat('p1', {
        includesVat: false,
      });

      expect(result).toMatchObject({
        includesVat: false,
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 1000,
      });
    });

    it('throws when the payment does not exist', async () => {
      mockPrismaService.supplierPayment.update.mockRejectedValue(
        new PrismaClientKnownRequestError('Not found', {
          code: PRISMA_ERROR_CODES.NOT_FOUND,
          clientVersion: 'test',
        }),
      );

      await expect(
        service.setIncludesVat('nope', { includesVat: true }),
      ).rejects.toThrow(SupplierPaymentNotFoundError);
    });
  });

  describe('paid flag', () => {
    /**
     * `jest.fn().mock.calls` is `any[][]`, so reaching into it directly trips
     * no-unsafe-member-access. Narrow once, here.
     */
    function firstUpdateManyArgs(): {
      where: { supplierId: string; projectReport?: unknown };
      data: { isPaid: boolean };
    } {
      const calls = mockPrismaService.supplierPayment.updateMany.mock
        .calls as unknown[][];
      return calls[0][0] as {
        where: { supplierId: string; projectReport?: unknown };
        data: { isPaid: boolean };
      };
    }

    it('marks a single payment paid', async () => {
      mockPrismaService.supplierPayment.update.mockResolvedValue({
        id: 'p1',
        amount: { toNumber: () => 1000 },
        date: new Date('2026-03-05'),
        description: null,
        isFuture: false,
        includesVat: false,
        isPaid: true,
        projectReportId: 'report-1',
        supplierId: 'supplier-1',
        projectReport: {
          id: 'report-1',
          date: new Date('2023-01-01T00:00:00.000Z'),
          projectId: 'project-1',
          project: { id: 'project-1', name: 'Project 1' },
        },
        supplier: { id: 'supplier-1', name: 'Supplier 1' },
      });

      await service.setPaid('p1', { isPaid: true });

      expect(mockPrismaService.supplierPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: { isPaid: true },
        }) as unknown,
      );
    });

    it('throws when the payment does not exist', async () => {
      mockPrismaService.supplierPayment.update.mockRejectedValue(
        new PrismaClientKnownRequestError('Not found', {
          code: PRISMA_ERROR_CODES.NOT_FOUND,
          clientVersion: 'test',
        }),
      );

      await expect(service.setPaid('nope', { isPaid: true })).rejects.toThrow(
        SupplierPaymentNotFoundError,
      );
    });

    // A stack settles as one transfer, so the group action is the common case.
    it('marks every payment of one supplier in a month, and no others', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue({
        id: 'supplier-1',
      });
      mockPrismaService.supplierPayment.updateMany.mockResolvedValue({
        count: 4,
      });

      const result = await service.setPaidForSupplier('supplier-1', {
        isPaid: true,
        month: '2026-03-01',
      });

      expect(result).toEqual({ updated: 4 });
      const call = firstUpdateManyArgs();
      // Scoped to this supplier AND this month — not every payment they have.
      expect(call.where.supplierId).toBe('supplier-1');
      expect(call.where.projectReport).toBeDefined();
      expect(call.data).toEqual({ isPaid: true });
    });

    it('applies to every month when none is given', async () => {
      mockPrismaService.supplier.findUnique.mockResolvedValue({
        id: 'supplier-1',
      });
      mockPrismaService.supplierPayment.updateMany.mockResolvedValue({
        count: 9,
      });

      await service.setPaidForSupplier('supplier-1', { isPaid: false });

      const call = firstUpdateManyArgs();
      expect(call.where.projectReport).toBeUndefined();
    });
  });
});
