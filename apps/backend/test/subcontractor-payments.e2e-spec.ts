import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PrismaService } from '../src/prisma/prisma.service';
import { SubcontractorPaymentsService } from '../src/subcontractor-payments/subcontractor-payments.service';
import { ProjectReportsService } from '../src/project-reports/project-reports.service';
import { SubcontractorNotFoundError } from '../src/subcontractors/errors/subcontractor-not-found';
import { execSync } from 'child_process';
import * as path from 'path';
import { PrismaModule } from 'src/prisma/prisma.module';

/**
 * Integration tests for SubcontractorPaymentsService.
 * The service derives amountOwed at read time by aggregating ProjectReport rows.
 * SubcontractorPayments are partial payment records created manually.
 *
 * Uses testcontainers with PostgreSQL for a realistic database.
 */
describe('SubcontractorPaymentsService Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let service: SubcontractorPaymentsService;
  let projectReportsService: ProjectReportsService;
  let prismaService: PrismaService;

  let clientId: string;
  let subcontractorId: string;
  let projectId: string;
  let corporationId: string;

  const jan = new Date('2026-01-15').toISOString();
  const dec2025 = new Date('2025-12-15').toISOString(); // previous month seed

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:latest')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    const databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;

    execSync('pnpm prisma migrate deploy', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ DATABASE_URL: databaseUrl })],
        }),
        PrismaModule,
      ],
      providers: [SubcontractorPaymentsService, ProjectReportsService],
    }).compile();

    service = module.get<SubcontractorPaymentsService>(
      SubcontractorPaymentsService,
    );
    projectReportsService = module.get<ProjectReportsService>(
      ProjectReportsService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    clientId = (
      await prismaService.client.create({
        data: { name: `SubPay Test Client ${Date.now()}` },
      })
    ).id;

    subcontractorId = (
      await prismaService.subcontractor.create({
        data: {
          name: `SubPay Test Sub ${Date.now()}`,
          companyNumber: String(Date.now()).slice(-9),
        },
      })
    ).id;

    projectId = (
      await prismaService.project.create({
        data: {
          name: `SubPay Test Project ${Date.now()}`,
          clientId,
          estimatedAmount: 500000,
          description: '',
          requesterName: 'Test requester',
          location: 'Test location',
        },
      })
    ).id;

    corporationId = (
      await prismaService.corporation.create({
        data: { name: `SubPay Test Corp ${Date.now()}` },
      })
    ).id;

    // Seed the previous-month report so ProjectReportsService enrichment works
    await prismaService.projectReport.create({
      data: {
        projectId,
        subcontractorId,
        date: new Date(dec2025),
        profitMargin: 20,
        incomeEntries: { create: [{ amount: 40000 }] },
      },
    });
  });

  afterEach(async () => {
    await prismaService.subcontractorPayment.deleteMany({});
    await prismaService.corporationPayment.deleteMany({});
    await prismaService.projectReportIncome.deleteMany({});
    await prismaService.projectReport.deleteMany({});
    await prismaService.project.deleteMany({});
    await prismaService.corporation.deleteMany({});
    await prismaService.subcontractor.deleteMany({});
    await prismaService.client.deleteMany({});
  });

  afterAll(async () => {
    await prismaService.$disconnect();
    await container.stop();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────

  async function createReport(opts: {
    projectId: string;
    subcontractorId: string;
    date: string;
    incomeAmount: number;
    profitMargin: number;
    corporationPayments?: {
      corporationId: string;
      amount: number;
      date?: string;
    }[];
  }) {
    return projectReportsService.create({
      projectId: opts.projectId,
      subcontractorId: opts.subcontractorId,
      date: opts.date,
      incomeEntries: [{ amount: opts.incomeAmount }],
      profitMargin: opts.profitMargin,
      corporationPayments: opts.corporationPayments ?? [],
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // findSubcontractorMonthlyPayments
  // ────────────────────────────────────────────────────────────────────────────

  describe('findSubcontractorMonthlyPayments', () => {
    it('should compute amountOwed from a single project report', async () => {
      const incomeAmount = 100000;
      const profitMargin = 20;

      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount,
        profitMargin,
      });

      const result = await service.findSubcontractorMonthlyPayments(
        subcontractorId,
        { month: jan },
      );

      // amountOwed = income - profit - corpPayments = 100000 - 20000 - 0 = 80000
      const expected = incomeAmount - incomeAmount * (profitMargin / 100);
      expect(Math.abs(result.amountOwed - expected)).toBeLessThan(1);
    });

    it('should aggregate amountOwed across multiple projects for same subcontractor in same month', async () => {
      const proj2Id = (
        await prismaService.project.create({
          data: {
            name: `SubPay Multi Project ${Date.now()}`,
            clientId,
            estimatedAmount: 300000,
            description: '',
            requesterName: 'Test requester',
            location: 'Test location',
          },
        })
      ).id;

      // Seed previous month for proj2 so enrichment works
      await prismaService.projectReport.create({
        data: {
          projectId: proj2Id,
          subcontractorId,
          date: new Date(dec2025),
          profitMargin: 15,
          incomeEntries: { create: [{ amount: 30000 }] },
        },
      });

      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 100000,
        profitMargin: 20,
      });

      await createReport({
        projectId: proj2Id,
        subcontractorId,
        date: jan,
        incomeAmount: 60000,
        profitMargin: 15,
      });

      const result = await service.findSubcontractorMonthlyPayments(
        subcontractorId,
        { month: jan },
      );

      // Project 1: 100000 - 20% = 80000
      // Project 2: 60000 - 15% = 51000
      // Total: 131000
      const expected = 100000 * (1 - 20 / 100) + 60000 * (1 - 15 / 100);
      expect(Math.abs(result.amountOwed - expected)).toBeLessThan(1);
    });

    it('should subtract corporation payments from amountOwed', async () => {
      const incomeAmount = 100000;
      const profitMargin = 20;
      const corpAmount = 15000;

      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount,
        profitMargin,
        corporationPayments: [{ corporationId, amount: corpAmount, date: jan }],
      });

      const result = await service.findSubcontractorMonthlyPayments(
        subcontractorId,
        { month: jan },
      );

      // amountOwed = income - profit - corpPayments = 100000 - 20000 - 15000 = 65000
      const expected =
        incomeAmount - incomeAmount * (profitMargin / 100) - corpAmount;
      expect(Math.abs(result.amountOwed - expected)).toBeLessThan(1);
    });

    it('should return zero amountOwed when subcontractor has no reports in month', async () => {
      const result = await service.findSubcontractorMonthlyPayments(
        subcontractorId,
        { month: jan },
      );

      expect(result.amountOwed).toBe(0);
      expect(result.payments).toHaveLength(0);
    });

    it('should throw SubcontractorNotFoundError for non-existent subcontractor', async () => {
      await expect(
        service.findSubcontractorMonthlyPayments('non-existent-sub-id', {
          month: jan,
        }),
      ).rejects.toThrow(SubcontractorNotFoundError);
    });

    it('should include manual payment records in result', async () => {
      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 80000,
        profitMargin: 20,
      });

      // Manually create a partial payment
      await service.create({
        subcontractorId,
        projectId,
        serviceDate: jan,
        amount: 30000,
      });

      const result = await service.findSubcontractorMonthlyPayments(
        subcontractorId,
        { month: jan },
      );

      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].amount).toBe(30000);
    });

    it('should return empty payments when no manual payments created', async () => {
      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 80000,
        profitMargin: 20,
      });

      const result = await service.findSubcontractorMonthlyPayments(
        subcontractorId,
        { month: jan },
      );

      expect(result.payments).toHaveLength(0);
      expect(result.amountPaid).toBe(0);
    });

    it('should return subcontractor name and ID in result', async () => {
      const result = await service.findSubcontractorMonthlyPayments(
        subcontractorId,
        { month: jan },
      );

      expect(result.subcontractor.id).toBe(subcontractorId);
      expect(result.subcontractor.name).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // findSubcontractorPaymentsInMonth
  // ────────────────────────────────────────────────────────────────────────────

  describe('findSubcontractorPaymentsInMonth', () => {
    it('should return empty array when no SubcontractorPayment records exist for the month', async () => {
      const result = await service.findSubcontractorPaymentsInMonth({
        month: jan,
      });

      expect(result).toEqual([]);
    });

    it('should return all subcontractors who have SubcontractorPayment records in the month', async () => {
      const sub2Id = (
        await prismaService.subcontractor.create({
          data: {
            name: `SubPay Multi Sub ${Date.now()}`,
            companyNumber: String(Date.now()).slice(-9),
          },
        })
      ).id;

      const proj2Id = (
        await prismaService.project.create({
          data: {
            name: `Multi Sub Project ${Date.now()}`,
            clientId,
            estimatedAmount: 300000,
            description: '',
            requesterName: 'Test requester',
            location: 'Test location',
          },
        })
      ).id;

      // Seed previous months so enrichment works
      await prismaService.projectReport.create({
        data: {
          projectId: proj2Id,
          subcontractorId: sub2Id,
          date: new Date(dec2025),
          profitMargin: 15,
          incomeEntries: { create: [{ amount: 30000 }] },
        },
      });

      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 80000,
        profitMargin: 20,
      });

      await createReport({
        projectId: proj2Id,
        subcontractorId: sub2Id,
        date: jan,
        incomeAmount: 60000,
        profitMargin: 15,
      });

      // Create manual payments so both show up in findSubcontractorPaymentsInMonth
      await service.create({
        subcontractorId,
        projectId,
        serviceDate: jan,
        amount: 10000,
      });
      await service.create({
        subcontractorId: sub2Id,
        projectId: proj2Id,
        serviceDate: jan,
        amount: 10000,
      });

      const result = await service.findSubcontractorPaymentsInMonth({
        month: jan,
      });

      expect(result.length).toBe(2);

      const subIds = result.map((r) => r.subcontractor.id);
      expect(subIds).toContain(subcontractorId);
      expect(subIds).toContain(sub2Id);
    });

    it('should include correct amountOwed per subcontractor', async () => {
      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 100000,
        profitMargin: 20,
      });

      // Create a payment record so the sub appears in findSubcontractorPaymentsInMonth
      await service.create({
        subcontractorId,
        projectId,
        serviceDate: jan,
        amount: 10000,
      });

      const result = await service.findSubcontractorPaymentsInMonth({
        month: jan,
      });

      const sub = result.find((r) => r.subcontractor.id === subcontractorId);
      expect(sub).toBeDefined();

      // 100000 - 20% = 80000
      expect(Math.abs(sub!.amountOwed - 80000)).toBeLessThan(1);
    });

    it('should correctly aggregate amountOwed when one subcontractor has multiple projects', async () => {
      const proj2Id = (
        await prismaService.project.create({
          data: {
            name: `Agg Sub Multi Proj ${Date.now()}`,
            clientId,
            estimatedAmount: 300000,
            description: '',
            requesterName: 'Test requester',
            location: 'Test location',
          },
        })
      ).id;

      await prismaService.projectReport.create({
        data: {
          projectId: proj2Id,
          subcontractorId,
          date: new Date(dec2025),
          profitMargin: 15,
          incomeEntries: { create: [{ amount: 30000 }] },
        },
      });

      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 100000,
        profitMargin: 20,
      });

      await createReport({
        projectId: proj2Id,
        subcontractorId,
        date: jan,
        incomeAmount: 50000,
        profitMargin: 10,
      });

      // Create payment record to appear in results
      await service.create({
        subcontractorId,
        projectId,
        serviceDate: jan,
        amount: 10000,
      });

      const result = await service.findSubcontractorPaymentsInMonth({
        month: jan,
      });

      const sub = result.find((r) => r.subcontractor.id === subcontractorId);
      expect(sub).toBeDefined();

      // Project 1: 100000 - 20% = 80000
      // Project 2: 50000 - 10% = 45000
      // Total: 125000
      const expected = 100000 * 0.8 + 50000 * 0.9;
      expect(Math.abs(sub!.amountOwed - expected)).toBeLessThan(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Manual SubcontractorPayment creation
  // ────────────────────────────────────────────────────────────────────────────

  describe('SubcontractorPayment Creation', () => {
    it('should create a SubcontractorPayment record manually', async () => {
      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 50000,
        profitMargin: 20,
      });

      const payment = await service.create({
        subcontractorId,
        projectId,
        serviceDate: jan,
        amount: 20000,
      });

      expect(payment.amount).toBe(20000);

      const records = await prismaService.subcontractorPayment.findMany({
        where: { subcontractorId, serviceDate: new Date(jan) },
      });
      expect(records).toHaveLength(1);
      expect(records[0].subcontractorId).toBe(subcontractorId);
    });

    it('should allow multiple partial payments per subcontractor+project+month', async () => {
      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 80000,
        profitMargin: 20,
      });

      // amountOwed = 64000; two partial payments that don't exceed it
      await service.create({
        subcontractorId,
        projectId,
        serviceDate: jan,
        amount: 30000,
      });

      await expect(
        service.create({
          subcontractorId,
          projectId,
          serviceDate: jan,
          amount: 30000,
        }),
      ).resolves.toBeDefined();

      const records = await prismaService.subcontractorPayment.findMany({
        where: { subcontractorId, serviceDate: new Date(jan) },
      });
      expect(records).toHaveLength(2);
    });

    it('should allow same subcontractor to have payments across two projects in same month', async () => {
      const proj2Id = (
        await prismaService.project.create({
          data: {
            name: `Dup Sub Proj ${Date.now()}`,
            clientId,
            estimatedAmount: 200000,
            description: '',
            requesterName: 'Test requester',
            location: 'Test location',
          },
        })
      ).id;

      await prismaService.projectReport.create({
        data: {
          projectId: proj2Id,
          subcontractorId,
          date: new Date(dec2025),
          profitMargin: 20,
          incomeEntries: { create: [{ amount: 30000 }] },
        },
      });

      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 80000,
        profitMargin: 20,
      });

      await createReport({
        projectId: proj2Id,
        subcontractorId,
        date: jan,
        incomeAmount: 60000,
        profitMargin: 20,
      });

      await expect(
        service.create({
          subcontractorId,
          projectId,
          serviceDate: jan,
          amount: 30000,
        }),
      ).resolves.toBeDefined();

      await expect(
        service.create({
          subcontractorId,
          projectId: proj2Id,
          serviceDate: jan,
          amount: 20000,
        }),
      ).resolves.toBeDefined();

      const payments = await prismaService.subcontractorPayment.findMany({
        where: { subcontractorId, serviceDate: new Date(jan) },
      });
      expect(payments).toHaveLength(2);
    });

    it('should compute combined amountOwed from both projects', async () => {
      const proj2Id = (
        await prismaService.project.create({
          data: {
            name: `Combined Exp Proj ${Date.now()}`,
            clientId,
            estimatedAmount: 200000,
            description: '',
            requesterName: 'Test requester',
            location: 'Test location',
          },
        })
      ).id;

      await prismaService.projectReport.create({
        data: {
          projectId: proj2Id,
          subcontractorId,
          date: new Date(dec2025),
          profitMargin: 20,
          incomeEntries: { create: [{ amount: 30000 }] },
        },
      });

      await createReport({
        projectId,
        subcontractorId,
        date: jan,
        incomeAmount: 100000,
        profitMargin: 20,
      });

      await createReport({
        projectId: proj2Id,
        subcontractorId,
        date: jan,
        incomeAmount: 60000,
        profitMargin: 20,
      });

      const result = await service.findSubcontractorMonthlyPayments(
        subcontractorId,
        { month: jan },
      );

      // (100000 - 20%) + (60000 - 20%) = 80000 + 48000 = 128000
      const expected = 100000 * 0.8 + 60000 * 0.8;
      expect(Math.abs(result.amountOwed - expected)).toBeLessThan(1);
    });
  });
});
