import { Test, TestingModule } from '@nestjs/testing';
import { ProjectReportsService } from './project-reports.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { Prisma } from 'src/generated/client';
import { ProjectReportNotFoundError } from './errors/project-report-not-found.exception';
import { ProjectReportAlreadyExistsError } from './errors/project-report-already-exists.exception';
import { ProjectNotFoundError } from 'src/projects/errors/project-not-found.exception';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { CorporationNotFoundError } from 'src/corporations/errors/corporation-not-found.error';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

describe('ProjectReportsService', () => {
  let service: ProjectReportsService;

  const mockTx = {
    projectReport: {
      create: jest.fn(),
    },
  };

  const mockPrismaService = {
    $transaction: jest
      .fn()
      .mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx),
      ),
    projectReport: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectReportIncome: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProjectReportsService>(ProjectReportsService);
    jest.clearAllMocks();
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
    corporationPayments: [] as {
      id: string;
      amount: Prisma.Decimal;
      corporation: { id: string; name: string };
    }[],
    ...overrides,
  });

  const baseCreateDto = {
    projectId: 'project-1',
    subcontractorId: 'sub-1',
    date: '2024-05-01T00:00:00.000Z',
    profitMargin: 10,
    incomeEntries: [{ amount: 10000 }],
    corporationPayments: [],
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

    it('should throw CorporationNotFoundError on P2003 FK error', async () => {
      const mockReport = makeProjectReport();
      mockPrismaService.projectReport.findUnique.mockResolvedValue(null);
      mockTx.projectReport.create.mockResolvedValue(mockReport);

      const error = new PrismaClientKnownRequestError('FK failed', {
        code: PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED,
        clientVersion: '4.0.0',
      });
      mockTx.projectReport.create.mockRejectedValue(error);

      await expect(service.create(baseCreateDto)).rejects.toThrow(
        CorporationNotFoundError,
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
      corporationPayments: [] as {
        id: string;
        amount: Prisma.Decimal;
        corporation: { id: string; name: string };
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

    it('should return correct subcontractorPayment = totalIncome - profit - Σ(corporationPayments)', async () => {
      const fullReport = makeFullReport({
        corporationPayments: [
          {
            id: 'cp-1',
            amount: new Prisma.Decimal('2000'),
            corporation: { id: 'corp-1', name: 'Corp 1' },
          },
          {
            id: 'cp-2',
            amount: new Prisma.Decimal('500'),
            corporation: { id: 'corp-2', name: 'Corp 2' },
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
        corporationPayments: [
          {
            id: 'cp-1',
            amount: new Prisma.Decimal('3000'),
            corporation: { id: 'corp-1', name: 'Corp 1' },
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
      corporationPayments: [
        {
          corporationId: 'corp-1',
          amount: 2000,
          date: '2024-05-10T00:00:00.000Z',
        },
      ],
    };

    it('should update report and use deleteMany+createMany for corporation payments', async () => {
      const mockReport = makeProjectReport();
      mockPrismaService.projectReport.update.mockResolvedValue(mockReport);

      await service.update('report-1', updateDto);

      expect(mockPrismaService.projectReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            corporationPayments: {
              deleteMany: {},
              createMany: expect.objectContaining({
                data: expect.any(Array) as unknown,
              }) as Record<string, unknown>,
            },
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
});
