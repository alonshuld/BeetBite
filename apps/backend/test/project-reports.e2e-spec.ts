import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProjectReportsService } from '../src/project-reports/project-reports.service';
import { ProjectReportAlreadyExistsError } from '../src/project-reports/errors/project-report-already-exists.exception';
import { ProjectReportNotFoundError } from '../src/project-reports/errors/project-report-not-found.exception';
import { ProjectNotFoundError } from '../src/projects/errors/project-not-found.exception';
import { SubcontractorNotFoundError } from '../src/subcontractors/errors/subcontractor-not-found';
import { CreateProjectReportDto } from '../src/project-reports/dto/create-project-report.dto';
import { UpdateProjectReportDto } from '../src/project-reports/dto/update-project-report.dto';
import { execSync } from 'child_process';
import * as path from 'path';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CorporationNotFoundError } from 'src/corporations/errors/corporation-not-found.error';

/**
 * Integration tests for ProjectReportsService
 * Combines core functionality, financial calculations, and pagination tests
 * Uses testcontainers with PostgreSQL for realistic database testing
 */
describe('ProjectReportsService Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let service: ProjectReportsService;
  let prismaService: PrismaService;

  // Test data
  let projectId: string;
  let subcontractorId: string;
  const corporationIds: string[] = [];
  let clientId: string;
  const testDateStr = new Date('2026-01-15').toISOString();
  const previousMonthDateStr = new Date('2025-12-15').toISOString();
  // const testCounter = 0; // Counter to generate unique dates for tests

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:latest')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    const databaseUrl = container.getConnectionUri();

    // Run migrations
    process.env.DATABASE_URL = databaseUrl;
    try {
      execSync('pnpm prisma migrate deploy', {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: databaseUrl },
        // stdio: 'pipe',
        stdio: 'inherit',
      });
    } catch (error) {
      console.log('Migration failed');
      throw error;
    }

    // Create test module with Prisma service
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL: databaseUrl,
            }),
          ],
        }),
        PrismaModule,
      ],
      providers: [ProjectReportsService],
    }).compile();

    service = module.get<ProjectReportsService>(ProjectReportsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Seed test data
    clientId = (
      await prismaService.client.create({
        data: { name: `Test Client ${Date.now()}` },
      })
    ).id;

    projectId = (
      await prismaService.project.create({
        data: {
          name: `Test Project ${Date.now()}`,
          clientId,
          estimatedAmount: 100000,
          description: 'Test project',
        },
      })
    ).id;

    subcontractorId = (
      await prismaService.subcontractor.create({
        data: { name: `Test Subcontractor ${Date.now()}` },
      })
    ).id;

    for (let i = 0; i < 3; i++) {
      const corpId = (
        await prismaService.corporation.create({
          data: { name: `Test Corporation ${i} ${Date.now()}` },
        })
      ).id;
      corporationIds.push(corpId);
    }

    // Create a project report for the previous month to test enrichment
    await prismaService.projectReport.create({
      data: {
        projectId,
        subcontractorId,
        date: new Date(previousMonthDateStr),
        profitMargin: 20,
        income: 50000,
        incomeDate: new Date(previousMonthDateStr),
      },
    });
  });

  afterEach(async () => {
    // Clean up test data after each test to avoid conflicts
    await prismaService.subcontractorPayment.deleteMany({});
    await prismaService.corporationPayment.deleteMany({});
    await prismaService.projectReport.deleteMany({});
  });

  afterAll(async () => {
    // Final cleanup
    await prismaService.subcontractorPayment.deleteMany({});
    await prismaService.corporationPayment.deleteMany({});
    await prismaService.projectReport.deleteMany({});
    await prismaService.$disconnect();
    await container.stop();
  });

  // ============================================================
  // CORE FUNCTIONALITY TESTS
  // ============================================================

  describe('Create Operations', () => {
    it('should create a new project report with all required fields', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 15.5,
        income: 60000,
        incomeDate: testDateStr,
        corporationPayments: [
          {
            corporationId: corporationIds[0],
            amount: 10000,
            date: testDateStr,
          },
        ],
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.project.id).toBe(projectId);
      expect(result.subcontractor.id).toBe(subcontractorId);
      expect(result.income).toBe(60000);
      expect(result.profitMargin).toBe(15.5);
    });

    it('should enrich project report with previous month data when fields are missing', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        date: testDateStr,
        income: 75000,
        incomeDate: testDateStr,
        corporationPayments: [],
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.subcontractor.id).toBe(subcontractorId);
      expect(result.profitMargin).toBe(20);
      expect(result.income).toBe(75000);
    });

    it('should handle multiple corporation payments', async () => {
      const corp2Id = (
        await prismaService.corporation.create({
          data: { name: `Corp 2 ${Date.now()}` },
        })
      ).id;

      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 18,
        income: 80000,
        corporationPayments: [
          {
            corporationId: corporationIds[0],
            amount: 15000,
            date: testDateStr,
          },
          {
            corporationId: corp2Id,
            amount: 12000,
            date: testDateStr,
          },
        ],
      };

      const result = await service.create(createDto);
      const fullReport = await prismaService.projectReport.findUnique({
        where: { id: result.id },
        include: { corporationPayments: true },
      });

      expect(fullReport?.corporationPayments || []).toHaveLength(2);
    });

    it('should throw ProjectReportAlreadyExistsError for duplicate project and date', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: previousMonthDateStr,
        profitMargin: 15,
        income: 55000,
        corporationPayments: [],
      };

      await expect(service.create(createDto)).rejects.toThrow(
        ProjectReportAlreadyExistsError,
      );
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      const createDto: CreateProjectReportDto = {
        projectId: 'non-existent-project-id',
        subcontractorId,
        date: testDateStr,
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      await expect(service.create(createDto)).rejects.toThrow(
        ProjectNotFoundError,
      );
    });

    it('should throw SubcontractorNotFoundError when subcontractor does not exist', async () => {
      const anotherProjectId = (
        await prismaService.project.create({
          data: {
            name: `Another Project ${Date.now()}`,
            clientId,
            estimatedAmount: 100000,
            description: 'Test project',
          },
        })
      ).id;

      await prismaService.projectReport.create({
        data: {
          projectId: anotherProjectId,
          subcontractorId,
          date: new Date(previousMonthDateStr),
          profitMargin: 20,
          income: 50000,
        },
      });

      const createDto: CreateProjectReportDto = {
        projectId: anotherProjectId,
        subcontractorId: 'non-existent-subcontractor-id',
        date: testDateStr,
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      await expect(service.create(createDto)).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });

    it('should throw ProjectReportNotFoundError when enriching with missing previous month report', async () => {
      const newProjectId = (
        await prismaService.project.create({
          data: {
            name: `New Project ${Date.now()}`,
            clientId,
            estimatedAmount: 100000,
            description: 'Test project',
          },
        })
      ).id;

      const createDto: CreateProjectReportDto = {
        projectId: newProjectId,
        date: testDateStr,
        income: 50000,
        corporationPayments: [],
      };

      await expect(service.create(createDto)).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });

    it('should throw error when corporation payment references non-existent corporation', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 18,
        income: 80000,
        corporationPayments: [
          {
            corporationId: corporationIds[0],
            amount: 15000,
            date: testDateStr,
          },
          {
            corporationId: 'non-existent-corp',
            amount: 12000,
            date: testDateStr,
          },
        ],
      };

      await expect(service.create(createDto)).rejects.toThrow(
        CorporationNotFoundError,
      );
    });

    it('should handle zero income', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 10,
        income: 0,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      expect(result.income).toBe(0);
    });

    it('should handle decimal precision for income and profit margin', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 12.75,
        income: 99999.99,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      expect(result.profitMargin).toBe(12.75);
      expect(result.income).toBe(99999.99);
    });

    it('should create a subcontractor payment record', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      await service.create(createDto);

      const payment = await prismaService.subcontractorPayment.findFirst({
        where: {
          subcontractorId,
          serviceDate: testDateStr,
        },
      });

      expect(payment).toBeDefined();
      expect(payment?.subcontractorId).toBe(subcontractorId);
    });
  });

  describe('Read Operations', () => {
    let reportId: string;

    beforeEach(async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 20,
        income: 100000,
        incomeDate: testDateStr,
        corporationPayments: [
          {
            corporationId: corporationIds[0],
            amount: 20000,
            date: testDateStr,
          },
        ],
      };

      const result = await service.create(createDto);
      reportId = result.id;
    });

    it('should retrieve a project report by ID', async () => {
      const result = await service.findOne(reportId);
      expect(result).toBeDefined();
      expect(result.id).toBe(reportId);
      expect(result.project.id).toBe(projectId);
      expect(result.income).toBe(100000);
    });

    it('should calculate profit correctly', async () => {
      const result = await service.findOne(reportId);
      const expectedProfit = 100000 * (20 / 100);
      expect(result.profit).toBe(expectedProfit);
    });

    it('should calculate subcontractor payment correctly', async () => {
      const result = await service.findOne(reportId);
      const profit = 100000 * (20 / 100);
      const corporationPaymentsTotal = 20000;
      const expectedSubcontractorPayment =
        100000 - profit - corporationPaymentsTotal;
      expect(result.subcontractor.payment).toBe(expectedSubcontractorPayment);
    });

    it('should throw ProjectReportNotFoundError when report does not exist', async () => {
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });

    it('should include subcontractor payment information', async () => {
      const result = await service.findOne(reportId);
      expect(result.subcontractor.name).toBeDefined();
      expect(result.corporationPayments).toBeDefined();
      expect(Array.isArray(result.corporationPayments)).toBe(true);
    });

    it('should handle reports with no corporation payments', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: '2026-09-15',
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      const newReport = await service.create(createDto);
      const result = await service.findOne(newReport.id);

      expect(result.corporationPayments).toHaveLength(0);
      const expectedSubcontractorPayment = 50000 * (1 - 15 / 100);
      expect(result.subcontractor.payment).toBe(expectedSubcontractorPayment);
    });
  });

  describe('Update Operations', () => {
    let reportId: string;

    beforeEach(async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      reportId = result.id;
    });

    it('should update an existing project report', async () => {
      const updateDto: UpdateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 25,
        income: 75000,
        corporationPayments: [
          {
            corporationId: corporationIds[0],
            amount: 15000,
            date: testDateStr,
          },
        ],
      };

      const result = await service.update(reportId, updateDto);
      expect(result.profitMargin).toBe(25);
      expect(result.income).toBe(75000);
    });

    it('should throw ProjectReportNotFoundError when updating non-existent report', async () => {
      const updateDto: UpdateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 20,
        income: 60000,
        corporationPayments: [],
      };

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(ProjectReportNotFoundError);
    });

    it('should throw ProjectNotFoundError when updating with invalid projectId', async () => {
      const updateDto: UpdateProjectReportDto = {
        projectId: 'non-existent-project',
        subcontractorId,
        date: testDateStr,
        profitMargin: 20,
        income: 60000,
        corporationPayments: [],
      };

      await expect(service.update(reportId, updateDto)).rejects.toThrow(
        ProjectNotFoundError,
      );
    });

    it('should throw SubcontractorNotFoundError when updating with invalid subcontractorId', async () => {
      const updateDto: UpdateProjectReportDto = {
        projectId,
        subcontractorId: 'non-existent-subcontractor',
        date: testDateStr,
        profitMargin: 20,
        income: 60000,
        corporationPayments: [],
      };

      await expect(service.update(reportId, updateDto)).rejects.toThrow(
        SubcontractorNotFoundError,
      );
    });

    it('should handle partial updates with enrichment', async () => {
      const updateDto: UpdateProjectReportDto = {
        projectId,
        date: testDateStr,
        income: 80000,
        corporationPayments: [],
      };

      const result = await service.update(reportId, updateDto);
      expect(result.income).toBe(80000);
      expect(result.subcontractor.id).toBe(subcontractorId);
    });
  });

  describe('Delete Operations', () => {
    let reportId: string;

    beforeEach(async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      reportId = result.id;
    });

    it('should delete a project report', async () => {
      await service.remove(reportId);

      await expect(service.findOne(reportId)).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });

    it('should throw ProjectReportNotFoundError when deleting non-existent report', async () => {
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        ProjectReportNotFoundError,
      );
    });

    it('should allow re-creation of a report after deletion', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      await service.remove(reportId);
      const secondReport = await service.create(createDto);

      expect(secondReport.id).not.toBe(reportId);
      expect(secondReport.date).toBe(testDateStr);
    });
  });

  // ============================================================
  // FINANCIAL CALCULATIONS TESTS
  // ============================================================

  describe('Financial Calculations - Decimal Precision', () => {
    it('should maintain precision with fractional profit margins', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 33.333,
        income: 100000,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      const fullReport = await service.findOne(result.id);

      expect(fullReport.profitMargin).toBe(33.33);
      const expectedProfit = 100000 * (33.33 / 100);
      expect(Math.abs(fullReport.profit - expectedProfit)).toBeLessThan(1);
    });

    it.each([
      { margin: 10, income: 50000, expectedProfit: 5000 },
      { margin: 25.5, income: 100000, expectedProfit: 25500 },
      { margin: 50, income: 80000, expectedProfit: 40000 },
    ])(
      'should correctly calculate profit for a $margin% margin on $income income',
      async ({ margin, income, expectedProfit }) => {
        const createDto: CreateProjectReportDto = {
          projectId,
          subcontractorId,
          date: testDateStr,
          profitMargin: margin,
          income: income,
          corporationPayments: [],
        };

        const result = await service.create(createDto);
        const fullReport = await service.findOne(result.id);

        expect(Math.abs(fullReport.profit - expectedProfit)).toBeLessThan(10);
      },
    );

    // it('should correctly calculate profit with various margins', async () => {
    //   const testCases = [
    //     { margin: 10, income: 50000, expectedProfit: 5000 },
    //     { margin: 25.5, income: 100000, expectedProfit: 25500 },
    //     { margin: 50, income: 80000, expectedProfit: 40000 },
    //   ];
    //
    //   for (let i = 0; i < testCases.length; i++) {
    //     const tc = testCases[i];
    //
    //     const createDto: CreateProjectReportDto = {
    //       projectId,
    //       subcontractorId,
    //       date: testDateStr,
    //       profitMargin: tc.margin,
    //       income: tc.income,
    //       corporationPayments: [],
    //     };
    //
    //     const result = await service.create(createDto);
    //     const fullReport = await service.findOne(result.id);
    //     expect(Math.abs(fullReport.profit - tc.expectedProfit)).toBeLessThan(
    //       10,
    //     );
    //   }
    // });

    it('should handle income with cent precision', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 20,
        income: 99999.99,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      const fullReport = await service.findOne(result.id);

      expect(fullReport.income).toBe(99999.99);
      const expectedProfit = 99999.99 * (20 / 100);
      expect(Math.abs(fullReport.profit - expectedProfit)).toBeLessThan(1);
    });
  });

  describe('Financial Calculations - Payment Distribution', () => {
    it('should correctly distribute payments among multiple corporations', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 30,
        income: 100000,
        corporationPayments: [
          {
            corporationId: corporationIds[0],
            amount: 10000,
            date: testDateStr,
          },
          {
            corporationId: corporationIds[1],
            amount: 15000,
            date: testDateStr,
          },
          {
            corporationId: corporationIds[2],
            amount: 8000,
            date: testDateStr,
          },
        ],
      };

      const result = await service.create(createDto);
      const fullReport = await service.findOne(result.id);

      const totalCorporationPayments = 10000 + 15000 + 8000;
      const expectedProfit = 100000 * (30 / 100);
      const expectedSubcontractorPayment =
        100000 - expectedProfit - totalCorporationPayments;

      expect(fullReport.profit).toBe(expectedProfit);
      expect(fullReport.subcontractor.payment).toBe(
        expectedSubcontractorPayment,
      );
    });

    it('should calculate subcontractor payment as income minus profit minus corporation payments', async () => {
      const dateStr = testDateStr;
      const income = 150000;
      const profitMargin = 22.5;
      const corpPayments = [
        { corporationId: corporationIds[0], amount: 25000, date: dateStr },
        { corporationId: corporationIds[1], amount: 30000, date: dateStr },
      ];

      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: dateStr,
        profitMargin,
        income,
        corporationPayments: corpPayments,
      };

      const result = await service.create(createDto);
      const fullReport = await service.findOne(result.id);

      const profit = income * (profitMargin / 100);
      const corpTotal = corpPayments.reduce((sum, p) => sum + p.amount, 0);
      const expectedSubPayment = income - profit - corpTotal;

      expect(
        Math.abs(fullReport.subcontractor.payment - expectedSubPayment),
      ).toBeLessThan(1);
    });

    it('should handle edge case where subcontractor payment equals zero', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 50,
        income: 100000,
        corporationPayments: [
          {
            corporationId: corporationIds[0],
            amount: 50000,
            date: testDateStr,
          },
        ],
      };

      const result = await service.create(createDto);
      const fullReport = await service.findOne(result.id);

      expect(fullReport.subcontractor.payment).toBe(0);
    });

    it('should handle edge case where profit is zero', async () => {
      const income = 100000;
      const profitMargin = 0;

      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin,
        income,
        corporationPayments: [
          {
            corporationId: corporationIds[0],
            amount: 25000,
            date: testDateStr,
          },
        ],
      };

      const result = await service.create(createDto);
      const fullReport = await service.findOne(result.id);

      expect(fullReport.profit).toBe(0);
      expect(fullReport.subcontractor.payment).toBe(75000);
    });

    it('should handle edge case where profit is entire income', async () => {
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin: 100,
        income: 50000,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      const fullReport = await service.findOne(result.id);

      expect(fullReport.profit).toBe(50000);
      expect(fullReport.subcontractor.payment).toBe(0);
    });

    it('should handle large income amounts with multiple payments', async () => {
      const income = 999999.99;
      const profitMargin = 15.75;

      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: testDateStr,
        profitMargin,
        income,
        corporationPayments: [
          {
            corporationId: corporationIds[0],
            amount: 99999.99,
            date: testDateStr,
          },
          {
            corporationId: corporationIds[1],
            amount: 150000,
            date: testDateStr,
          },
        ],
      };

      const result = await service.create(createDto);
      const fullReport = await service.findOne(result.id);

      const expectedProfit = income * (profitMargin / 100);
      const expectedSubPayment = income - expectedProfit - (99999.99 + 150000);

      expect(Math.abs(fullReport.profit - expectedProfit)).toBeLessThan(1);
      expect(
        Math.abs(fullReport.subcontractor.payment - expectedSubPayment),
      ).toBeLessThan(1);
    });
  });

  // ============================================================
  // PAGINATION AND FILTERING TESTS
  // ============================================================

  describe('Pagination - findProjectReportsInMonth', () => {
    beforeEach(async () => {
      for (let i = 0; i < 10; i++) {
        const subId = (
          await prismaService.subcontractor.create({
            data: { name: `Sub Pag ${i} ${Date.now()}` },
          })
        ).id;

        const proj = (
          await prismaService.project.create({
            data: {
              name: `Project Pag ${i} ${Date.now()}`,
              clientId,
              estimatedAmount: 100000,
              description: 'Test project',
            },
          })
        ).id;

        await prismaService.projectReport.create({
          data: {
            projectId: proj,
            subcontractorId: subId,
            date: new Date(previousMonthDateStr),
            profitMargin: 20,
            income: 50000,
          },
        });

        await service.create({
          projectId: proj,
          date: testDateStr,
          income: 60000 + i * 5000,
          corporationPayments: [],
        });
      }
    });

    it('should retrieve all reports for a given month with default pagination', async () => {
      const result = await service.findProjectReportsInMonth({
        month: testDateStr,
      });

      expect(result.length).toBeGreaterThanOrEqual(10);
    });

    it('should apply page limit correctly', async () => {
      const result = await service.findProjectReportsInMonth({
        month: testDateStr,
        page: 1,
        limit: 5,
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should respect page number in pagination', async () => {
      const page1 = await service.findProjectReportsInMonth({
        month: testDateStr,
        page: 1,
        limit: 3,
      });

      const page2 = await service.findProjectReportsInMonth({
        month: testDateStr,
        page: 2,
        limit: 3,
      });

      if (page1.length === 3 && page2.length > 0) {
        const page1Ids = page1.map((r) => r.id);
        const page2Ids = page2.map((r) => r.id);
        expect(page1Ids).not.toEqual(page2Ids);
      }
    });

    it('should handle large limit values', async () => {
      const result = await service.findProjectReportsInMonth({
        month: testDateStr,
        page: 1,
        limit: 1000,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle page size of 1', async () => {
      const result = await service.findProjectReportsInMonth({
        month: testDateStr,
        page: 1,
        limit: 1,
      });

      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array for page beyond available data', async () => {
      const result = await service.findProjectReportsInMonth({
        month: testDateStr,
        page: 9999,
        limit: 10,
      });

      expect(result.length).toBe(0);
    });

    it('should handle month queries with different date formats', async () => {
      const result1 = await service.findProjectReportsInMonth({
        month: testDateStr,
        page: 1,
        limit: 100,
      });

      const result2 = await service.findProjectReportsInMonth({
        month: testDateStr,
        page: 1,
        limit: 100,
      });

      expect(result1.length).toBeGreaterThan(0);
      expect(result2.length).toBeGreaterThan(0);
    });

    it('should return empty for month with no reports', async () => {
      const farMonth = new Date('2030-05-01').toISOString();
      const result = await service.findProjectReportsInMonth({
        month: farMonth,
        page: 1,
        limit: 100,
      });

      expect(result).toEqual([]);
    });
  });

  describe('Previous Month Lookup - findProjectReportForPreviousMonth', () => {
    it('should find the report for the previous month', async () => {
      const result = await service.findProjectReportForPreviousMonth(
        projectId,
        { month: testDateStr },
      );

      expect(result).toBeDefined();
      expect(result.project.id).toBe(projectId);
      expect(result.date).toBe(previousMonthDateStr);
    });

    it('should throw ProjectReportNotFoundError when previous month report does not exist', async () => {
      const newProjectId = (
        await prismaService.project.create({
          data: {
            name: `New Project For Prev ${Date.now()}`,
            clientId,
            estimatedAmount: 100000,
            description: 'Test project',
          },
        })
      ).id;

      await expect(
        service.findProjectReportForPreviousMonth(newProjectId, {
          month: testDateStr,
        }),
      ).rejects.toThrow(ProjectReportNotFoundError);
    });

    it('should work correctly for cross-year previous month', async () => {
      const projectId2 = (
        await prismaService.project.create({
          data: {
            name: `Project CrossYear ${Date.now()}`,
            clientId,
            estimatedAmount: 100000,
            description: 'Test project',
          },
        })
      ).id;

      const subId = (
        await prismaService.subcontractor.create({
          data: { name: `Sub CrossYear ${Date.now()}` },
        })
      ).id;

      const decDate = new Date('2025-12-15');
      await prismaService.projectReport.create({
        data: {
          projectId: projectId2,
          subcontractorId: subId,
          date: decDate,
          profitMargin: 20,
          income: 50000,
        },
      });

      const result = await service.findProjectReportForPreviousMonth(
        projectId2,
        { month: testDateStr },
      );

      expect(result).toBeDefined();
      expect(result.project.id).toBe(projectId2);
    });
  });

  // ============================================================
  // EDGE CASES AND CONSTRAINTS
  // ============================================================

  describe('Edge Cases and Constraints', () => {
    it('should enforce unique constraint on projectId and date', async () => {
      const date = new Date('2026-10-01').toISOString().split('T')[0];

      const createDto1: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date,
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      const createDto2: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date,
        profitMargin: 20,
        income: 60000,
        corporationPayments: [],
      };

      await service.create(createDto1);
      await expect(service.create(createDto2)).rejects.toThrow(
        ProjectReportAlreadyExistsError,
      );
    });

    it('should handle very large income amounts', async () => {
      const largeIncomeDate = new Date('2026-11-01');
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: largeIncomeDate.toISOString().split('T')[0],
        profitMargin: 10,
        income: 999999.99,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      expect(result.income).toBe(999999.99);
    });

    it('should handle minimum profit margin', async () => {
      const minMarginDate = new Date('2026-11-10');
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: minMarginDate.toISOString().split('T')[0],
        profitMargin: 0,
        income: 50000,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      expect(result.profitMargin).toBe(0);
    });

    it('should handle maximum profit margin', async () => {
      const maxMarginDate = new Date('2026-11-20');
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: maxMarginDate.toISOString().split('T')[0],
        profitMargin: 100,
        income: 50000,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      expect(result.profitMargin).toBe(100);
    });

    it('should handle leap year dates', async () => {
      const leapYearDate = new Date('2024-02-29');
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: leapYearDate.toISOString().split('T')[0],
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      expect(result).toBeDefined();
    });

    it('should preserve Decimal precision in calculations', async () => {
      const precisionDate = new Date('2026-11-30');
      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: precisionDate.toISOString().split('T')[0],
        profitMargin: 33.33,
        income: 99999.99,
        corporationPayments: [],
      };

      const result = await service.create(createDto);
      const fullReport = await service.findOne(result.id);

      expect(fullReport.profitMargin).toBe(33.33);
      expect(fullReport.income).toBe(99999.99);
    });
  });

  describe('Transaction Integrity', () => {
    it('should rollback on corporation payment error during creation', async () => {
      const invalidCorpId = 'non-existent-corp';
      const txDate = new Date('2026-12-01');

      const createDto: CreateProjectReportDto = {
        projectId,
        subcontractorId,
        date: txDate.toISOString().split('T')[0],
        profitMargin: 15,
        income: 50000,
        corporationPayments: [
          {
            corporationId: invalidCorpId,
            amount: 10000,
            date: txDate.toISOString().split('T')[0],
          },
        ],
      };

      await expect(service.create(createDto)).rejects.toThrow();

      const existingReports = await prismaService.projectReport.findMany({
        where: {
          projectId,
          date: txDate,
        },
      });

      expect(existingReports).toHaveLength(0);
    });

    it('should ensure subcontractor payment is created with report', async () => {
      const subPaymentDate = new Date('2026-12-10');
      const newSubId = (
        await prismaService.subcontractor.create({
          data: { name: `Sub for Payment Test ${Date.now()}` },
        })
      ).id;

      const newProjId = (
        await prismaService.project.create({
          data: {
            name: `Project for Payment Test ${Date.now()}`,
            clientId,
            estimatedAmount: 100000,
            description: 'Test project',
          },
        })
      ).id;

      await prismaService.projectReport.create({
        data: {
          projectId: newProjId,
          subcontractorId: newSubId,
          date: new Date(previousMonthDateStr),
          profitMargin: 20,
          income: 50000,
        },
      });

      const createDto: CreateProjectReportDto = {
        projectId: newProjId,
        subcontractorId: newSubId,
        date: subPaymentDate.toISOString().split('T')[0],
        profitMargin: 15,
        income: 50000,
        corporationPayments: [],
      };

      await service.create(createDto);

      const payment = await prismaService.subcontractorPayment.findFirst({
        where: {
          subcontractorId: newSubId,
          serviceDate: subPaymentDate,
        },
      });

      expect(payment).toBeDefined();
    });
  });
});
