import { Test, TestingModule } from '@nestjs/testing';
import { ProjectReportsService } from './project-reports.service';
import { ProjectClientAssignmentsService } from '../project-client-assignments/project-client-assignments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { Prisma } from 'src/generated/client';
import { ProjectReportNotFoundError } from './errors/project-report-not-found.exception';
import { ProjectReportAlreadyExistsError } from './errors/project-report-already-exists.exception';
import { ProjectNotFoundError } from 'src/projects/errors/project-not-found.exception';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { SupplierNotFoundError } from 'src/suppliers/errors/supplier-not-found.error';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';
import { InitiatorIncomeNotAllowedError } from './errors/initiator-income-not-allowed.error';
import { InitiatorIncomeTooLowError } from './errors/initiator-income-too-low.error';
import { SubcontractorNotInTeamError } from './errors/subcontractor-not-in-team.error';
import { ProjectReportHasSubcontractorPaymentsError } from './errors/project-report-has-subcontractor-payments.error';

describe('ProjectReportsService', () => {
  let service: ProjectReportsService;

  const mockTx = {
    projectReport: {
      create: vi.fn(),
    },
  };

  const mockPrismaService = {
    $transaction: vi
      .fn()
      .mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx),
      ),
    projectReport: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectReportIncome: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  };

  // Resolution is exercised by project-client-assignments.service.spec.ts.
  // An empty map here makes the read paths fall back to the project's cached
  // client, which is the behaviour every assertion below was written against.
  const mockAssignmentsService = {
    resolveClientsForMonth: vi.fn().mockResolvedValue(new Map()),
    createInitialAssignment: vi.fn().mockResolvedValue(undefined),
  };

  // No rate history: every payment's VAT resolves to none, which is what the
  // assertions below were written against. Derivation is covered by the mapper
  // and payment-vat specs.
  const mockVatRatesService = {
    findAllEntries: vi.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProjectClientAssignmentsService,
          useValue: mockAssignmentsService,
        },
        {
          provide: VatRatesService,
          useValue: mockVatRatesService,
        },
      ],
    }).compile();

    service = module.get<ProjectReportsService>(ProjectReportsService);
    vi.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const defaultIncomeEntries = [
    { id: 'entry-1', amount: new Prisma.Decimal('10000'), incomeDate: null },
  ];

  const makeProjectReport = (overrides = {}) => ({
    id: 'report-1',
    projectId: 'project-1',
    subcontractorId: 'sub-1',
    date: new Date('2024-05-01T00:00:00.000Z'),
    profitMargin: new Prisma.Decimal('10'),
    project: {
      id: 'project-1',
      name: 'Project 1',
      client: { id: 'client-1', name: 'Client 1' },
    },
    subcontractor: { id: 'sub-1', name: 'Sub 1' },
    incomeEntries: defaultIncomeEntries,
    supplierPayments: [] as {
      id: string;
      amount: Prisma.Decimal;
      supplier: { id: string; name: string };
    }[],
    ...overrides,
  });

  const baseCreateDto = {
    projectId: 'project-1',
    subcontractorId: 'sub-1',
    date: '2024-05-01T00:00:00.000Z',
    profitMargin: 10,
    incomeEntries: [{ amount: 10000 }],
    supplierPayments: [],
  };

  describe('create', () => {
    it('should create a project report with all fields provided', async () => {
      const mockReport = makeProjectReport();
      mockTx.projectReport.create.mockResolvedValue(mockReport);

      const result = await service.create(baseCreateDto);

      expect(result).toMatchObject({
        id: 'report-1',
        totalIncome: 10000,
        profitMargin: 10,
      });
      expect(mockTx.projectReport.create).toHaveBeenCalledTimes(1);
    });

    describe('initiatorIncome validation', () => {
      it('rejects initiatorIncome when the project has no initiator', async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({
          initiatorId: null,
        });

        await expect(
          service.create({ ...baseCreateDto, initiatorIncome: 20000 }),
        ).rejects.toThrow(InitiatorIncomeNotAllowedError);
      });

      it('rejects initiatorIncome that does not exceed the report income', async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({
          initiatorId: 'initiator-1',
        });

        await expect(
          service.create({ ...baseCreateDto, initiatorIncome: 10000 }),
        ).rejects.toThrow(InitiatorIncomeTooLowError);
      });

      it('stores initiatorIncome when the project has an initiator and the value exceeds income', async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({
          initiatorId: 'initiator-1',
        });
        const mockReport = makeProjectReport();
        mockTx.projectReport.create.mockResolvedValue(mockReport);

        await service.create({ ...baseCreateDto, initiatorIncome: 20000 });

        expect(mockTx.projectReport.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              initiatorIncome: new Prisma.Decimal(20000),
            }) as Record<string, unknown>,
          }),
        );
      });
    });

    it('should inherit subcontractorId from previous month when not provided', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue({
        profitMargin: new Prisma.Decimal('15'),
        subcontractorId: 'sub-previous',
      });
      const mockReport = makeProjectReport({ subcontractorId: 'sub-previous' });
      mockTx.projectReport.create.mockResolvedValue(mockReport);

      await service.create({ ...baseCreateDto, subcontractorId: undefined });

      expect(mockTx.projectReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subcontractor: { connect: { id: 'sub-previous' } },
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should inherit profitMargin from previous month when not provided', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue({
        profitMargin: new Prisma.Decimal('20'),
        subcontractorId: 'sub-1',
      });
      const mockReport = makeProjectReport({
        profitMargin: new Prisma.Decimal('20'),
      });
      mockTx.projectReport.create.mockResolvedValue(mockReport);

      await service.create({ ...baseCreateDto, profitMargin: undefined });

      expect(mockTx.projectReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profitMargin: new Prisma.Decimal(20),
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should preserve profitMargin: 0 and not inherit from previous month (BUG-02 regression)', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue({
        profitMargin: new Prisma.Decimal('25'),
        subcontractorId: 'sub-1',
      });
      const mockReport = makeProjectReport({
        profitMargin: new Prisma.Decimal('0'),
      });
      mockTx.projectReport.create.mockResolvedValue(mockReport);

      await service.create({
        ...baseCreateDto,
        subcontractorId: undefined,
        profitMargin: 0,
      });

      expect(mockTx.projectReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profitMargin: new Prisma.Decimal(0),
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should throw ProjectReportNotFoundError when previous month report not found during enrichment', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ ...baseCreateDto, subcontractorId: undefined }),
      ).rejects.toThrow(ProjectReportNotFoundError);
    });

    it('should throw SupplierNotFoundError on P2003 FK error', async () => {
      const mockReport = makeProjectReport();
      mockPrismaService.projectReport.findUnique.mockResolvedValue(null);
      mockTx.projectReport.create.mockResolvedValue(mockReport);

      const error = new PrismaClientKnownRequestError('FK failed', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '4.0.0',
      });
      mockTx.projectReport.create.mockRejectedValue(error);

      await expect(service.create(baseCreateDto)).rejects.toThrow(
        SupplierNotFoundError,
      );
    });

    it('should throw ProjectNotFoundError on P2025 with project model', async () => {
      const error = new PrismaClientKnownRequestError('Not found', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '4.0.0',
        meta: { model: 'Project' },
      });
      mockTx.projectReport.create.mockRejectedValue(error);

      await expect(service.create(baseCreateDto)).rejects.toThrow(
        ProjectNotFoundError,
      );
    });

    it('should throw SubcontractorNotFoundError on P2025 with subcontractor model', async () => {
      const error = new PrismaClientKnownRequestError('Not found', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '4.0.0',
        meta: { model: 'Subcontractor' },
      });
      mockTx.projectReport.create.mockRejectedValue(error);

      await expect(service.create(baseCreateDto)).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });

    it('should throw ProjectReportAlreadyExistsError on P2002 unique constraint', async () => {
      const error = new PrismaClientKnownRequestError('Unique failed', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '4.0.0',
      });
      mockTx.projectReport.create.mockRejectedValue(error);

      await expect(service.create(baseCreateDto)).rejects.toThrow(
        ProjectReportAlreadyExistsError,
      );
    });

    it('should not crash when Prisma P2025 error has no meta.model', async () => {
      const error = new PrismaClientKnownRequestError('Not found', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '4.0.0',
      });
      mockTx.projectReport.create.mockRejectedValue(error);

      await expect(service.create(baseCreateDto)).rejects.not.toThrow(
        TypeError,
      );
    });
  });

  describe('findProjectReportsInMonth', () => {
    it('should return project reports for the month', async () => {
      const mockReports = [
        makeProjectReport(),
        makeProjectReport({ id: 'report-2' }),
      ];
      mockPrismaService.projectReport.findMany.mockResolvedValue(mockReports);

      const result = await service.findProjectReportsInMonth({
        month: '2024-05-01T00:00:00.000Z',
        page: 1,
        limit: 10,
      });

      expect(result).toHaveLength(2);
      expect(mockPrismaService.projectReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date: '2024-05-01T00:00:00.000Z' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        makeProjectReport(),
      ]);

      await service.findProjectReportsInMonth({
        month: '2024-05-01T00:00:00.000Z',
        page: 3,
        limit: 5,
      });

      expect(mockPrismaService.projectReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('should return empty array when no reports found', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.findProjectReportsInMonth({
        month: '2024-05-01T00:00:00.000Z',
      });

      expect(result).toEqual([]);
    });
  });

  describe('findOneForExport', () => {
    it('should fetch the single report the PDF export renders', async () => {
      const mockReport = makeProjectReport();
      mockPrismaService.projectReport.findUnique.mockResolvedValue(mockReport);

      const result = await service.findOneForExport('report-1');

      expect(result.id).toBe(mockReport.id);
      expect(mockPrismaService.projectReport.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'report-1' } }),
      );
    });

    it('should throw ProjectReportNotFoundError when the report is missing', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue(null);

      await expect(service.findOneForExport('missing')).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });
  });

  describe('findOne', () => {
    const makeFullReport = (overrides = {}) => ({
      id: 'report-1',
      projectId: 'project-1',
      subcontractorId: 'sub-1',
      date: new Date('2024-05-01T00:00:00.000Z'),
      profitMargin: new Prisma.Decimal('10'),
      project: { id: 'project-1', name: 'Project 1' },
      subcontractor: {
        id: 'sub-1',
        name: 'Sub 1',
        payments: [],
      },
      incomeEntries: defaultIncomeEntries,
      supplierPayments: [] as {
        id: string;
        amount: Prisma.Decimal;
        supplier: { id: string; name: string };
      }[],
      ...overrides,
    });

    it('should return report with correct profit calculation', async () => {
      mockPrismaService.projectReport.findUnique
        .mockResolvedValueOnce({ date: new Date('2024-05-01T00:00:00.000Z') })
        .mockResolvedValueOnce(makeFullReport());

      const result = await service.findOne('report-1');

      expect(result.profit).toBeCloseTo(1000); // 10000 * 10 / 100
    });

    it('should return correct subcontractorPayment = totalIncome - profit - Σ(supplierPayments)', async () => {
      const fullReport = makeFullReport({
        supplierPayments: [
          {
            id: 'cp-1',
            amount: new Prisma.Decimal('2000'),
            supplier: { id: 'corp-1', name: 'Corp 1' },
          },
          {
            id: 'cp-2',
            amount: new Prisma.Decimal('500'),
            supplier: { id: 'corp-2', name: 'Corp 2' },
          },
        ],
      });
      mockPrismaService.projectReport.findUnique
        .mockResolvedValueOnce({ date: new Date('2024-05-01T00:00:00.000Z') })
        .mockResolvedValueOnce(fullReport);

      const result = await service.findOne('report-1');

      // totalIncome=10000, profit=1000 (10%), corpPayments=2500
      // subcontractorPayment = 10000 - 1000 - 2500 = 6500
      expect(result.subcontractor.payment).toBeCloseTo(6500);
    });

    it('should throw ProjectReportNotFoundError when first findUnique returns null', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue(null);

      await expect(service.findOne('report-999')).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });

    it('should throw ProjectReportNotFoundError when second findUnique returns null', async () => {
      mockPrismaService.projectReport.findUnique
        .mockResolvedValueOnce({ date: new Date('2024-05-01T00:00:00.000Z') })
        .mockResolvedValueOnce(null);

      await expect(service.findOne('report-999')).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });

    it('should handle profitMargin: 0 — subcontractorPayment equals totalIncome minus corp payments', async () => {
      const fullReport = makeFullReport({
        profitMargin: new Prisma.Decimal('0'),
        supplierPayments: [
          {
            id: 'cp-1',
            amount: new Prisma.Decimal('3000'),
            supplier: { id: 'corp-1', name: 'Corp 1' },
          },
        ],
      });
      mockPrismaService.projectReport.findUnique
        .mockResolvedValueOnce({ date: new Date('2024-05-01T00:00:00.000Z') })
        .mockResolvedValueOnce(fullReport);

      const result = await service.findOne('report-1');

      expect(result.profit).toBe(0);
      expect(result.subcontractor.payment).toBe(7000); // 10000 - 0 - 3000
    });

    // 🔴 initiatorIncome is documentation only. If it ever leaked into
    // subPayment/profit, this is what would catch it.
    it('does not change profit or subcontractorPayment when initiatorIncome is set', async () => {
      const supplierPayments = [
        {
          id: 'cp-1',
          amount: new Prisma.Decimal('2000'),
          supplier: { id: 'corp-1', name: 'Corp 1' },
        },
      ];
      const withoutInitiatorIncome = makeFullReport({ supplierPayments });
      const withInitiatorIncome = makeFullReport({
        supplierPayments,
        initiatorIncome: new Prisma.Decimal('50000'),
      });

      mockPrismaService.projectReport.findUnique
        .mockResolvedValueOnce({ date: new Date('2024-05-01T00:00:00.000Z') })
        .mockResolvedValueOnce(withoutInitiatorIncome);
      const before = await service.findOne('report-1');

      mockPrismaService.projectReport.findUnique
        .mockResolvedValueOnce({ date: new Date('2024-05-01T00:00:00.000Z') })
        .mockResolvedValueOnce(withInitiatorIncome);
      const after = await service.findOne('report-1');

      expect(after.profit).toBe(before.profit);
      expect(after.subcontractor.payment).toBe(before.subcontractor.payment);
      expect(after.totalIncome).toBe(before.totalIncome);
      // The figure is recorded and displayed, just never arithmetic.
      expect(after.initiatorIncome).toBe(50000);
    });
  });

  describe('findProjectReportForPreviousMonth', () => {
    it('should return the previous month report', async () => {
      const prevReport = makeProjectReport({
        date: new Date('2024-04-01T00:00:00.000Z'),
      });
      mockPrismaService.projectReport.findUnique.mockResolvedValue(prevReport);

      const result = await service.findProjectReportForPreviousMonth(
        'project-1',
        {
          month: '2024-05-01T00:00:00.000Z',
        },
      );

      expect(mockPrismaService.projectReport.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId_date: {
              projectId: 'project-1',
              date: new Date('2024-04-01T00:00:00.000Z'),
            },
          },
        }),
      );
      expect(result.id).toBe('report-1');
    });

    it('should throw ProjectReportNotFoundError when previous month report not found', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue(null);

      await expect(
        service.findProjectReportForPreviousMonth('project-1', {
          month: '2024-05-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(ProjectReportNotFoundError);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue({
        projectId: 'project-1',
        date: new Date('2024-05-01T00:00:00.000Z'),
      });
    });

    const updateDto = {
      projectId: 'project-1',
      subcontractorId: 'sub-1',
      date: '2024-05-01T00:00:00.000Z',
      profitMargin: 10,
      incomeEntries: [{ amount: 10000 }],
      supplierPayments: [
        {
          supplierId: 'corp-1',
          amount: 2000,
          date: '2024-05-10T00:00:00.000Z',
        },
      ],
    };

    describe('initiatorIncome validation', () => {
      it('rejects initiatorIncome when the project has no initiator', async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({
          initiatorId: null,
        });

        await expect(
          service.update('report-1', { ...updateDto, initiatorIncome: 20000 }),
        ).rejects.toThrow(InitiatorIncomeNotAllowedError);
      });

      it("rejects initiatorIncome that does not exceed the update's own incomeEntries total", async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({
          initiatorId: 'initiator-1',
        });

        await expect(
          service.update('report-1', { ...updateDto, initiatorIncome: 10000 }),
        ).rejects.toThrow(InitiatorIncomeTooLowError);
      });

      it('falls back to the stored income total when incomeEntries is omitted from the update', async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({
          initiatorId: 'initiator-1',
        });
        mockPrismaService.projectReportIncome.aggregate.mockResolvedValue({
          _sum: { amount: new Prisma.Decimal(15000) },
        });

        await expect(
          service.update('report-1', {
            projectId: updateDto.projectId,
            subcontractorId: updateDto.subcontractorId,
            date: updateDto.date,
            profitMargin: updateDto.profitMargin,
            supplierPayments: updateDto.supplierPayments,
            initiatorIncome: 15000,
          }),
        ).rejects.toThrow(InitiatorIncomeTooLowError);
        expect(
          mockPrismaService.projectReportIncome.aggregate,
        ).toHaveBeenCalledWith({
          where: { projectReportId: 'report-1' },
          _sum: { amount: true },
        });
      });

      it('rejects raising income entries above a previously stored initiatorIncome', async () => {
        mockPrismaService.projectReport.findUnique.mockResolvedValue({
          projectId: updateDto.projectId,
          date: new Date(updateDto.date),
          initiatorIncome: new Prisma.Decimal(60000),
        });

        await expect(
          service.update('report-1', {
            ...updateDto,
            incomeEntries: [{ amount: 70000, incomeDate: undefined }],
          }),
        ).rejects.toThrow(InitiatorIncomeTooLowError);
        expect(mockPrismaService.projectReport.update).not.toHaveBeenCalled();
      });

      it('stores initiatorIncome when valid', async () => {
        mockPrismaService.project.findUnique.mockResolvedValue({
          initiatorId: 'initiator-1',
        });
        const mockReport = makeProjectReport();
        mockPrismaService.projectReport.update.mockResolvedValue(mockReport);

        await service.update('report-1', {
          ...updateDto,
          initiatorIncome: 20000,
        });

        expect(mockPrismaService.projectReport.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              initiatorIncome: new Prisma.Decimal(20000),
            }) as Record<string, unknown>,
          }),
        );
      });

      it('clears initiatorIncome on null without validating it', async () => {
        mockPrismaService.projectReport.findUnique.mockResolvedValue({
          projectId: updateDto.projectId,
          date: new Date(updateDto.date),
          initiatorIncome: new Prisma.Decimal(60000),
        });
        mockPrismaService.projectReport.update.mockResolvedValue(
          makeProjectReport(),
        );

        // Income above the stored initiator income would be rejected if it
        // were kept — clearing it removes the constraint.
        await service.update('report-1', {
          ...updateDto,
          incomeEntries: [{ amount: 70000 }],
          initiatorIncome: null,
        });

        expect(mockPrismaService.project.findUnique).not.toHaveBeenCalled();
        expect(mockPrismaService.projectReport.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              initiatorIncome: null,
            }) as Record<string, unknown>,
          }),
        );
      });

      it('leaves initiatorIncome untouched when omitted', async () => {
        mockPrismaService.projectReport.update.mockResolvedValue(
          makeProjectReport(),
        );

        await service.update('report-1', updateDto);

        const [[args]] = mockPrismaService.projectReport.update.mock.calls as [
          [{ data: Record<string, unknown> }],
        ];
        expect(args.data.initiatorIncome).toBeUndefined();
      });
    });

    it('should update report and use deleteMany+createMany for supplier payments', async () => {
      const mockReport = makeProjectReport();
      mockPrismaService.projectReport.update.mockResolvedValue(mockReport);

      await service.update('report-1', updateDto);

      expect(mockPrismaService.projectReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            supplierPayments: {
              deleteMany: {},
              createMany: expect.objectContaining({
                data: expect.any(Array) as unknown,
              }) as Record<string, unknown>,
            },
          }) as Record<string, unknown>,
        }),
      );
    });

    it('leaves existing supplier payments untouched when supplierPayments is omitted', async () => {
      mockPrismaService.projectReport.update.mockResolvedValue(
        makeProjectReport(),
      );
      const { supplierPayments: _omitted, ...withoutSuppliers } = updateDto;
      void _omitted;

      await service.update('report-1', withoutSuppliers);

      expect(mockPrismaService.projectReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            supplierPayments: expect.anything() as unknown,
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should throw ProjectReportNotFoundError on P2025 with ProjectReport model', async () => {
      const error = new PrismaClientKnownRequestError('Not found', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '4.0.0',
        meta: { model: 'ProjectReport' },
      });
      mockPrismaService.projectReport.update.mockRejectedValue(error);

      await expect(service.update('report-999', updateDto)).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });

    it('should throw ProjectNotFoundError on P2025 with Project model', async () => {
      const error = new PrismaClientKnownRequestError('Not found', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '4.0.0',
        meta: { model: 'Project' },
      });
      mockPrismaService.projectReport.update.mockRejectedValue(error);

      await expect(service.update('report-1', updateDto)).rejects.toThrow(
        ProjectNotFoundError,
      );
    });

    it('should throw ProjectReportAlreadyExistsError on P2002 unique constraint', async () => {
      const error = new PrismaClientKnownRequestError('Unique failed', {
        code: PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED,
        clientVersion: '4.0.0',
      });
      mockPrismaService.projectReport.update.mockRejectedValue(error);

      await expect(service.update('report-1', updateDto)).rejects.toThrow(
        ProjectReportAlreadyExistsError,
      );
    });

    it('should not crash when Prisma P2025 error has no meta.model (BUG-08 regression)', async () => {
      const error = new PrismaClientKnownRequestError('Not found', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '4.0.0',
      });
      mockPrismaService.projectReport.update.mockRejectedValue(error);

      await expect(service.update('report-1', updateDto)).rejects.not.toThrow(
        TypeError,
      );
    });
  });

  describe('remove', () => {
    it('should remove a project report', async () => {
      mockPrismaService.projectReport.delete.mockResolvedValue({});

      await expect(service.remove('report-1')).resolves.toBeUndefined();

      expect(mockPrismaService.projectReport.delete).toHaveBeenCalledWith({
        where: { id: 'report-1' },
      });
    });

    it('should throw ProjectReportNotFoundError when report not found', async () => {
      const error = new PrismaClientKnownRequestError('Not found', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '4.0.0',
      });
      mockPrismaService.projectReport.delete.mockRejectedValue(error);

      await expect(service.remove('report-999')).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });
  });

  describe('addIncomeEntry', () => {
    it('should add a new income entry to an existing report', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue({
        id: 'report-1',
      });
      mockPrismaService.projectReportIncome.create.mockResolvedValue({
        id: 'entry-new',
        amount: new Prisma.Decimal('5000'),
        incomeDate: null,
        tag: 'שלד',
      });

      const result = await service.addIncomeEntry('report-1', {
        amount: 5000,
        tag: 'שלד',
      });

      expect(result).toEqual({
        id: 'entry-new',
        amount: 5000,
        incomeDate: null,
        tag: 'שלד',
      });
      expect(mockPrismaService.projectReportIncome.create).toHaveBeenCalledWith(
        {
          data: {
            projectReportId: 'report-1',
            amount: new Prisma.Decimal(5000),
            incomeDate: null,
            tag: 'שלד',
          },
        },
      );
    });

    it('should throw ProjectReportNotFoundError when the report does not exist', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue(null);

      await expect(
        service.addIncomeEntry('missing-report', { amount: 1000 }),
      ).rejects.toThrow(ProjectReportNotFoundError);
      expect(
        mockPrismaService.projectReportIncome.create,
      ).not.toHaveBeenCalled();
    });

    it('trims a blank tag down to null', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue({
        id: 'report-1',
      });
      mockPrismaService.projectReportIncome.create.mockResolvedValue({
        id: 'entry-new',
        amount: new Prisma.Decimal('5000'),
        incomeDate: null,
        tag: null,
      });

      await service.addIncomeEntry('report-1', { amount: 5000, tag: '   ' });

      expect(mockPrismaService.projectReportIncome.create).toHaveBeenCalledWith(
        {
          data: {
            projectReportId: 'report-1',
            amount: new Prisma.Decimal(5000),
            incomeDate: null,
            tag: null,
          },
        },
      );
    });
  });

  describe('income entries vs a stored initiatorIncome', () => {
    beforeEach(() => {
      mockPrismaService.projectReportIncome.findUnique.mockReset();
      mockPrismaService.projectReportIncome.aggregate.mockReset();
    });

    it('rejects adding an entry that lifts income to the initiator income', async () => {
      mockPrismaService.projectReport.findUnique.mockResolvedValue({
        id: 'report-1',
        initiatorIncome: new Prisma.Decimal(60000),
      });
      mockPrismaService.projectReportIncome.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(40000) },
      });

      await expect(
        service.addIncomeEntry('report-1', { amount: 20000 }),
      ).rejects.toThrow(InitiatorIncomeTooLowError);
      expect(
        mockPrismaService.projectReportIncome.create,
      ).not.toHaveBeenCalled();
    });

    it('rejects raising an entry so income reaches the initiator income', async () => {
      mockPrismaService.projectReportIncome.findUnique.mockResolvedValue({
        amount: new Prisma.Decimal(40000),
        projectReportId: 'report-1',
        projectReport: { initiatorIncome: new Prisma.Decimal(60000) },
      });
      mockPrismaService.projectReportIncome.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(40000) },
      });
      mockPrismaService.projectReportIncome.update.mockClear();

      await expect(
        service.updateIncomeEntry('entry-1', { amount: 60000 }),
      ).rejects.toThrow(InitiatorIncomeTooLowError);
      expect(
        mockPrismaService.projectReportIncome.update,
      ).not.toHaveBeenCalled();
    });

    it('allows raising an entry while income stays below the initiator income', async () => {
      mockPrismaService.projectReportIncome.findUnique.mockResolvedValue({
        amount: new Prisma.Decimal(40000),
        projectReportId: 'report-1',
        projectReport: { initiatorIncome: new Prisma.Decimal(60000) },
      });
      mockPrismaService.projectReportIncome.aggregate.mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(40000) },
      });
      mockPrismaService.projectReportIncome.update.mockResolvedValue({
        id: 'entry-1',
        amount: new Prisma.Decimal(59999),
        incomeDate: null,
        tag: null,
      });

      await expect(
        service.updateIncomeEntry('entry-1', { amount: 59999 }),
      ).resolves.toMatchObject({ amount: 59999 });
    });
  });

  describe('updateIncomeEntry', () => {
    it('updates only the single income row in place, preserving its id', async () => {
      mockPrismaService.projectReportIncome.update.mockResolvedValue({
        id: 'entry-1',
        amount: new Prisma.Decimal('12000'),
        incomeDate: null,
        tag: 'גמר',
      });

      const result = await service.updateIncomeEntry('entry-1', {
        tag: 'גמר',
      });

      // 🔴 The trap this task exists to avoid: a tag patch must go through
      // projectReportIncome.update targeted at this one row, never through
      // deleteMany+createMany on the parent report. The id returned is the
      // same id that was passed in — nothing was destroyed and recreated.
      expect(result.id).toBe('entry-1');
      expect(mockPrismaService.projectReportIncome.update).toHaveBeenCalledWith(
        {
          where: { id: 'entry-1' },
          data: { tag: 'גמר' },
        },
      );
      // The report-level delete-and-recreate path is never touched by a
      // single-entry patch.
      expect(mockPrismaService.projectReport.update).not.toHaveBeenCalled();
    });

    it('clears the tag when given null', async () => {
      mockPrismaService.projectReportIncome.update.mockResolvedValue({
        id: 'entry-1',
        amount: new Prisma.Decimal('12000'),
        incomeDate: null,
        tag: null,
      });

      await service.updateIncomeEntry('entry-1', { tag: null });

      expect(mockPrismaService.projectReportIncome.update).toHaveBeenCalledWith(
        {
          where: { id: 'entry-1' },
          data: { tag: null },
        },
      );
    });

    it('does not touch the tag when the caller only sends an amount', async () => {
      mockPrismaService.projectReportIncome.update.mockResolvedValue({
        id: 'entry-1',
        amount: new Prisma.Decimal('9000'),
        incomeDate: null,
        tag: 'existing-tag',
      });

      await service.updateIncomeEntry('entry-1', { amount: 9000 });

      // Exact match (not objectContaining): proves `tag` is absent from the
      // write, so an amount-only update cannot silently clear it.
      expect(mockPrismaService.projectReportIncome.update).toHaveBeenCalledWith(
        {
          where: { id: 'entry-1' },
          data: { amount: new Prisma.Decimal(9000) },
        },
      );
    });

    it('throws EntityNotFoundError when the entry does not exist', async () => {
      const error = new PrismaClientKnownRequestError('Not found', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '4.0.0',
      });
      mockPrismaService.projectReportIncome.update.mockRejectedValue(error);

      await expect(
        service.updateIncomeEntry('missing-entry', { tag: 'x' }),
      ).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('removeIncomeEntry', () => {
    it('removes a single income entry', async () => {
      mockPrismaService.projectReportIncome.delete.mockResolvedValue({});

      await expect(
        service.removeIncomeEntry('entry-1'),
      ).resolves.toBeUndefined();
      expect(mockPrismaService.projectReportIncome.delete).toHaveBeenCalledWith(
        { where: { id: 'entry-1' } },
      );
    });

    it('throws EntityNotFoundError when the entry does not exist', async () => {
      const error = new PrismaClientKnownRequestError('Not found', {
        code: PRISMA_ERROR_CODES.NOT_FOUND,
        clientVersion: '4.0.0',
      });
      mockPrismaService.projectReportIncome.delete.mockRejectedValue(error);

      await expect(service.removeIncomeEntry('missing-entry')).rejects.toThrow(
        EntityNotFoundError,
      );
    });
  });

  describe('changeSubcontractor', () => {
    const changeTx = {
      projectReport: { findUnique: vi.fn(), update: vi.fn() },
      subcontractor: { findUnique: vi.fn() },
      subcontractorPayment: { count: vi.fn() },
    };
    const reportDate = new Date('2026-05-01');

    beforeEach(() => {
      mockPrismaService.$transaction.mockImplementation(
        (cb: (tx: typeof changeTx) => Promise<unknown>) => cb(changeTx),
      );
      changeTx.projectReport.findUnique.mockResolvedValue({
        projectId: 'project-1',
        date: reportDate,
        subcontractor: { id: 'member-a', teamId: 'team-1' },
      });
      changeTx.subcontractor.findUnique.mockResolvedValue({ teamId: 'team-1' });
      changeTx.subcontractorPayment.count.mockResolvedValue(0);
    });

    it('hands the project to a teammate', async () => {
      await service.changeSubcontractor('report-1', 'member-b');

      expect(changeTx.subcontractorPayment.count).toHaveBeenCalledWith({
        where: {
          subcontractorId: 'member-a',
          projectId: 'project-1',
          serviceDate: reportDate,
        },
      });
      expect(changeTx.projectReport.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { subcontractorId: 'member-b' },
      });
    });

    it('does nothing when the member is unchanged', async () => {
      await service.changeSubcontractor('report-1', 'member-a');

      expect(changeTx.projectReport.update).not.toHaveBeenCalled();
    });

    it('refuses a subcontractor from another team', async () => {
      changeTx.subcontractor.findUnique.mockResolvedValue({ teamId: 'team-2' });

      await expect(
        service.changeSubcontractor('report-1', 'other'),
      ).rejects.toThrow(SubcontractorNotInTeamError);
      expect(changeTx.projectReport.update).not.toHaveBeenCalled();
    });

    it('refuses when neither works in a team', async () => {
      changeTx.projectReport.findUnique.mockResolvedValue({
        projectId: 'project-1',
        date: reportDate,
        subcontractor: { id: 'solo-a', teamId: null },
      });
      changeTx.subcontractor.findUnique.mockResolvedValue({ teamId: null });

      await expect(
        service.changeSubcontractor('report-1', 'solo-b'),
      ).rejects.toThrow(SubcontractorNotInTeamError);
    });

    it('refuses once payments are recorded for the current member', async () => {
      changeTx.subcontractorPayment.count.mockResolvedValue(1);

      await expect(
        service.changeSubcontractor('report-1', 'member-b'),
      ).rejects.toThrow(ProjectReportHasSubcontractorPaymentsError);
      expect(changeTx.projectReport.update).not.toHaveBeenCalled();
    });

    it('throws when the report does not exist', async () => {
      changeTx.projectReport.findUnique.mockResolvedValue(null);

      await expect(
        service.changeSubcontractor('missing', 'member-b'),
      ).rejects.toThrow(ProjectReportNotFoundError);
    });

    it('throws when the new subcontractor does not exist', async () => {
      changeTx.subcontractor.findUnique.mockResolvedValue(null);

      await expect(
        service.changeSubcontractor('report-1', 'ghost'),
      ).rejects.toThrow(SubcontractorNotFoundError);
    });
  });
});
