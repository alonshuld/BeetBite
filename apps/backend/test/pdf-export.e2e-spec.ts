import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import * as path from 'path';
import request from 'supertest';
import type { Server } from 'http';

import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { PdfExportModule } from 'src/pdf-export/pdf-export.module';
import { PdfExportService } from 'src/pdf-export/pdf-export.service';
import { AuthModule } from 'src/auth/auth.module';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { EntityExceptionFilter } from 'src/common/filters/filter-entity-exception.filter';
import { CompanySettingsIncompleteError } from 'src/pdf-export/errors/company-settings-incomplete.error';
import { VatRateNotConfiguredError } from 'src/pdf-export/errors/vat-rate-not-configured.error';
import { NoReportsForExportError } from 'src/pdf-export/errors/no-reports-for-export.error';
import { ExportProjectReportsPdfDto } from 'src/pdf-export/dto/export-project-reports-pdf.dto';

/**
 * Integration coverage for the monthly account-approval PDF export.
 *
 * `pdf-export.service.spec.ts` covers the service's branching with every
 * collaborator mocked. This suite is the complement: real Postgres, real
 * services, real template — so the report query, VAT carry-forward, tag join
 * and HTML rendering are exercised against actual rows, and the controller is
 * driven over HTTP through the same pipes and filters as production.
 *
 * Puppeteer is stubbed and the HTML handed to `setContent` is captured for
 * assertion. It cannot be un-stubbed here: puppeteer v25 ships ESM only, and
 * Jest's CommonJS loader cannot `requireActual` it. Proof that a real browser
 * renders a real PDF therefore lives one layer up, in
 * `apps/e2e/tests/pdf-export.spec.ts`, where the backend runs as an ordinary
 * Node process that can require an ES module.
 */

// Jest hoists this factory above the imports, so anything it closes over must
// be named `mock*` — hence the prefix on an otherwise plain state bag.
const mockPuppeteerState = {
  html: '',
};

jest.mock('puppeteer', () => ({
  __esModule: true,
  default: {
    launch: () =>
      Promise.resolve({
        newPage: () =>
          Promise.resolve({
            setContent: (html: string) => {
              mockPuppeteerState.html = html;
              return Promise.resolve();
            },
            // '%PDF' — enough for the Content-Length assertion below.
            pdf: () =>
              Promise.resolve(Uint8Array.from([0x25, 0x50, 0x44, 0x46])),
          }),
        close: () => Promise.resolve(),
      }),
  },
}));

const JWT_SECRET = 'pdf-export-e2e-secret-at-least-32-characters';
const SETTINGS_ID = 'company-settings';

/** The month under test, already normalized the way the DTO transform would. */
const MONTH = '2026-05-01T00:00:00.000Z';
const PREVIOUS_MONTH = '2026-04-01T00:00:00.000Z';
const NEXT_MONTH = '2026-06-01T00:00:00.000Z';

/** Baseline VAT, set far enough back that it carries forward to MONTH. */
const BASELINE_VAT_MONTH = new Date('2020-01-01T00:00:00.000Z');
const BASELINE_VAT = 18;

describe('PDF Export Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let moduleRef: TestingModule;
  let service: PdfExportService;
  let prisma: PrismaService;
  let app: INestApplication;
  let httpServer: Server;
  let token: string;

  let clientId: string;
  let otherClientId: string;
  let projectId: string;
  let subcontractorId: string;
  let otherSubcontractorId: string;
  let corporationId: string;

  /** A well-formed export request for the seeded fixtures. */
  const exportDto = (
    overrides: Partial<ExportProjectReportsPdfDto> = {},
  ): ExportProjectReportsPdfDto => ({
    subcontractorId,
    clientId,
    month: MONTH,
    approvedFor: 'Shell works',
    lang: 'en',
    ...overrides,
  });

  /** Runs an export and returns the HTML the template produced. */
  const renderHtml = async (
    overrides: Partial<ExportProjectReportsPdfDto> = {},
  ): Promise<string> => {
    mockPuppeteerState.html = '';
    await service.exportProjectReportsPdf(exportDto(overrides));
    return mockPuppeteerState.html;
  };

  const createProject = async (name: string) =>
    prisma.project.create({
      data: {
        clientId,
        name,
        estimatedAmount: 100000,
        description: `${name} description`,
      },
    });

  /** Creates a report with income entries and optional corporation payments. */
  const seedReport = async (opts: {
    projectId: string;
    subcontractorId: string;
    date: string;
    profitMargin: number;
    incomes: number[];
    corporationPayments?: Array<{ corporationId: string; amount: number }>;
  }) =>
    prisma.projectReport.create({
      data: {
        projectId: opts.projectId,
        subcontractorId: opts.subcontractorId,
        date: new Date(opts.date),
        profitMargin: opts.profitMargin,
        incomeEntries: { create: opts.incomes.map((amount) => ({ amount })) },
        ...(opts.corporationPayments
          ? {
              corporationPayments: {
                create: opts.corporationPayments.map((payment) => ({
                  corporationId: payment.corporationId,
                  amount: payment.amount,
                  date: new Date(opts.date),
                })),
              },
            }
          : {}),
      },
    });

  /** The default report every "given a report exists" block starts from. */
  const seedDefaultReport = async () =>
    seedReport({
      projectId,
      subcontractorId,
      date: MONTH,
      profitMargin: 10,
      incomes: [10000],
    });

  /** Formats a number the way the template's currency helper does. */
  const money = (amount: number): string =>
    `₪${amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    const databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET = JWT_SECRET;

    execSync('pnpm prisma migrate deploy', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL: databaseUrl,
              jwt: { secret: JWT_SECRET, expiresIn: '1h' },
            }),
          ],
        }),
        PrismaModule,
        AuthModule,
        PdfExportModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();

    service = moduleRef.get(PdfExportService);
    prisma = moduleRef.get(PrismaService);

    // Mirror main.ts so validation and error mapping behave as in production.
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new EntityExceptionFilter());
    await app.init();

    httpServer = app.getHttpServer() as Server;

    token = moduleRef
      .get(JwtService)
      .sign({ sub: 'test-user-id', username: 'tester' });
  });

  beforeEach(async () => {
    clientId = (await prisma.client.create({ data: { name: 'Acme Homes' } }))
      .id;
    otherClientId = (
      await prisma.client.create({ data: { name: 'Other Client' } })
    ).id;

    projectId = (await createProject('Tower A')).id;

    subcontractorId = (
      await prisma.subcontractor.create({
        data: { name: 'Dan Builder', companyNumber: '515111222' },
      })
    ).id;
    otherSubcontractorId = (
      await prisma.subcontractor.create({
        data: { name: 'Other Sub', companyNumber: '515333444' },
      })
    ).id;

    corporationId = (
      await prisma.corporation.create({ data: { name: 'Flooring Ltd' } })
    ).id;

    await prisma.companySettings.create({
      data: {
        id: SETTINGS_ID,
        name: 'BeetBite Contracting',
        companyNumber: '515999888',
      },
    });

    await prisma.vatRate.create({
      data: { effectiveMonth: BASELINE_VAT_MONTH, percentage: BASELINE_VAT },
    });

    mockPuppeteerState.html = '';
  });

  afterEach(async () => {
    await prisma.subcontractorPayment.deleteMany();
    await prisma.corporationPayment.deleteMany();
    await prisma.projectReportIncome.deleteMany();
    await prisma.projectReport.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    await prisma.subcontractor.deleteMany();
    await prisma.corporation.deleteMany();
    await prisma.vatRate.deleteMany();
    await prisma.companySettings.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
    await container.stop();
  });

  // ==========================================================================
  // Scoping — the query the mocked unit spec cannot exercise
  // ==========================================================================

  describe('Report scoping', () => {
    it('should render one row per matching project report', async () => {
      const second = await createProject('Tower B');
      await seedDefaultReport();
      await seedReport({
        projectId: second.id,
        subcontractorId,
        date: MONTH,
        profitMargin: 10,
        incomes: [20000],
      });

      const html = await renderHtml();

      expect(html).toContain('Tower A');
      expect(html).toContain('Tower B');
    });

    it("should exclude the subcontractor's reports under a different client", async () => {
      const foreign = await prisma.project.create({
        data: {
          clientId: otherClientId,
          name: 'Foreign Project',
          estimatedAmount: 1000,
          description: 'Another client',
        },
      });
      await seedDefaultReport();
      await seedReport({
        projectId: foreign.id,
        subcontractorId,
        date: MONTH,
        profitMargin: 10,
        incomes: [99999],
      });

      const html = await renderHtml();

      expect(html).toContain('Tower A');
      expect(html).not.toContain('Foreign Project');
    });

    it("should exclude another subcontractor's reports under the same client", async () => {
      const sibling = await createProject('Sibling Project');
      await seedDefaultReport();
      await seedReport({
        projectId: sibling.id,
        subcontractorId: otherSubcontractorId,
        date: MONTH,
        profitMargin: 10,
        incomes: [88888],
      });

      const html = await renderHtml();

      expect(html).toContain('Tower A');
      expect(html).not.toContain('Sibling Project');
    });

    it('should exclude reports from the adjacent months', async () => {
      const before = await createProject('April Project');
      const after = await createProject('June Project');
      await seedDefaultReport();
      await seedReport({
        projectId: before.id,
        subcontractorId,
        date: PREVIOUS_MONTH,
        profitMargin: 10,
        incomes: [1000],
      });
      await seedReport({
        projectId: after.id,
        subcontractorId,
        date: NEXT_MONTH,
        profitMargin: 10,
        incomes: [2000],
      });

      const html = await renderHtml();

      expect(html).toContain('Tower A');
      expect(html).not.toContain('April Project');
      expect(html).not.toContain('June Project');
    });

    it('should throw NoReportsForExportError when nothing matches', async () => {
      await expect(
        service.exportProjectReportsPdf(exportDto()),
      ).rejects.toThrow(NoReportsForExportError);
    });
  });

  // ==========================================================================
  // VAT resolution — carry-forward is invisible to the mocked unit spec
  // ==========================================================================

  describe('VAT resolution', () => {
    beforeEach(seedDefaultReport);

    it('should bill the invoice column at the resolved rate', async () => {
      const html = await renderHtml();

      // 10,000 + 18%
      expect(html).toContain(money(11800));
    });

    it('should carry a rate forward from an earlier month', async () => {
      await prisma.vatRate.create({
        data: { effectiveMonth: new Date('2026-02-01'), percentage: 20 },
      });

      const html = await renderHtml();

      expect(html).toContain(money(12000));
    });

    it('should ignore a rate that only becomes effective later', async () => {
      await prisma.vatRate.create({
        data: { effectiveMonth: new Date(NEXT_MONTH), percentage: 25 },
      });

      const html = await renderHtml();

      // Still the 18% baseline, not June's 25%.
      expect(html).toContain(money(11800));
      expect(html).not.toContain(money(12500));
    });

    it('should throw VatRateNotConfiguredError when no rate is effective', async () => {
      await prisma.vatRate.deleteMany();

      await expect(
        service.exportProjectReportsPdf(exportDto()),
      ).rejects.toThrow(VatRateNotConfiguredError);
    });
  });

  // ==========================================================================
  // Financial roll-up
  // ==========================================================================

  describe('Financial roll-up', () => {
    it('should aggregate a multi-entry report into one approved amount', async () => {
      await seedReport({
        projectId,
        subcontractorId,
        date: MONTH,
        profitMargin: 10,
        incomes: [4000, 6000],
      });

      const html = await renderHtml();

      expect(html).toContain(money(10000));
    });

    it('should flatten supplier rows across every report in the month', async () => {
      const plumbing = await prisma.corporation.create({
        data: { name: 'Plumbing Ltd' },
      });
      const second = await createProject('Tower B');
      await seedReport({
        projectId,
        subcontractorId,
        date: MONTH,
        profitMargin: 10,
        incomes: [10000],
        corporationPayments: [{ corporationId, amount: 1000 }],
      });
      await seedReport({
        projectId: second.id,
        subcontractorId,
        date: MONTH,
        profitMargin: 10,
        incomes: [20000],
        corporationPayments: [{ corporationId: plumbing.id, amount: 2500 }],
      });

      const html = await renderHtml();

      expect(html).toContain('Flooring Ltd');
      expect(html).toContain('Plumbing Ltd');
      // Total deductions = 1,000 + 2,500
      expect(html).toContain(money(3500));
    });

    it('should compute payable excl. and incl. VAT from the month totals', async () => {
      await seedReport({
        projectId,
        subcontractorId,
        date: MONTH,
        profitMargin: 10,
        incomes: [10000],
        corporationPayments: [{ corporationId, amount: 1000 }],
      });

      const html = await renderHtml();

      // profit 1,000 → afterProfit 9,000 → less 1,000 supplier → 8,000
      expect(html).toContain(money(8000));
      // 8,000 + 18%
      expect(html).toContain(money(9440));
    });
  });

  // ==========================================================================
  // Tags — the join the mocked unit spec can only fake
  // ==========================================================================

  describe('Subcontractor payment tags', () => {
    const seedPayment = async (
      tag: string | null,
      amount = 100,
      serviceDate = MONTH,
    ) =>
      prisma.subcontractorPayment.create({
        data: {
          subcontractorId,
          projectId,
          amount,
          serviceDate: new Date(serviceDate),
          tag,
        },
      });

    beforeEach(seedDefaultReport);

    it("should render the month's tag in the project row", async () => {
      await seedPayment('Concrete');

      const html = await renderHtml();

      expect(html).toContain('Concrete');
    });

    it('should join several tags for one project', async () => {
      await seedPayment('Concrete');
      await seedPayment('Rebar', 200);

      const html = await renderHtml();

      expect(html).toContain('Concrete · Rebar');
    });

    it('should ignore a payment recorded in a different month', async () => {
      await seedPayment('April work', 100, PREVIOUS_MONTH);

      const html = await renderHtml();

      expect(html).not.toContain('April work');
    });
  });

  // ==========================================================================
  // Company settings
  // ==========================================================================

  describe('Company settings', () => {
    beforeEach(seedDefaultReport);

    it('should throw when the company name is blank', async () => {
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { name: null },
      });

      await expect(
        service.exportProjectReportsPdf(exportDto()),
      ).rejects.toThrow(CompanySettingsIncompleteError);
    });

    it('should throw when the company number is blank', async () => {
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { companyNumber: null },
      });

      await expect(
        service.exportProjectReportsPdf(exportDto()),
      ).rejects.toThrow(CompanySettingsIncompleteError);
    });

    it('should join a full address as "street, city"', async () => {
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { addressStreet: 'HaHaroshet 5', addressCity: 'Ashkelon' },
      });

      const html = await renderHtml();

      expect(html).toContain('HaHaroshet 5, Ashkelon');
    });

    it('should render a street-only address without a trailing comma', async () => {
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { addressStreet: 'HaHaroshet 5', addressCity: null },
      });

      const html = await renderHtml();

      expect(html).toContain('HaHaroshet 5');
      expect(html).not.toContain('HaHaroshet 5,');
    });

    it('should render a city-only address without a leading comma', async () => {
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { addressStreet: null, addressCity: 'Ashkelon' },
      });

      const html = await renderHtml();

      expect(html).toContain('Ashkelon');
      expect(html).not.toContain(', Ashkelon');
    });

    it('should embed the logo and signature data URLs when present', async () => {
      const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
      const signature = 'data:image/png;base64,U2lnbmF0dXJl';
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { logo, signature },
      });

      const html = await renderHtml();

      expect(html).toContain(`src="${logo}"`);
      expect(html).toContain(`src="${signature}"`);
    });

    it('should render no image tags when logo and signature are unset', async () => {
      const html = await renderHtml();

      expect(html).not.toContain('<img');
    });
  });

  // ==========================================================================
  // Template
  // ==========================================================================

  describe('Template rendering', () => {
    beforeEach(seedDefaultReport);

    it('should render right-to-left for Hebrew', async () => {
      const html = await renderHtml({ lang: 'he' });

      expect(html).toContain('dir="rtl"');
      expect(html).toContain('אישור חשבון');
    });

    it('should render left-to-right for English', async () => {
      const html = await renderHtml({ lang: 'en' });

      expect(html).toContain('dir="ltr"');
      expect(html).toContain('Account Approval');
    });

    it('should default to Hebrew when no language is given', async () => {
      const html = await renderHtml({ lang: undefined });

      expect(html).toContain('dir="rtl"');
    });

    it('should escape HTML in free text and entity names', async () => {
      await prisma.client.update({
        where: { id: clientId },
        data: { name: '<script>alert(1)</script>' },
      });

      const html = await renderHtml({
        approvedFor: 'Works & "extras" <b>bold</b>',
      });

      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain(
        'Works &amp; &quot;extras&quot; &lt;b&gt;bold&lt;/b&gt;',
      );
    });
  });

  // ==========================================================================
  // HTTP surface
  // ==========================================================================

  describe('POST /api/v1/projects/reports/export-pdf', () => {
    const url = '/api/v1/projects/reports/export-pdf';

    const body = (overrides: Record<string, unknown> = {}) => ({
      subcontractorId,
      clientId,
      month: MONTH,
      approvedFor: 'Shell works',
      lang: 'en',
      ...overrides,
    });

    beforeEach(seedDefaultReport);

    it('should reject an unauthenticated request', async () => {
      await request(httpServer).post(url).send(body()).expect(401);
    });

    it('should stream the PDF with download headers', async () => {
      const response = await request(httpServer)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body())
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toBe(
        'attachment; filename="account-approval-2026-05.pdf"',
      );
      expect(Number(response.headers['content-length'])).toBe(
        (response.body as Buffer).length,
      );
      expect((response.body as Buffer).toString('latin1')).toBe('%PDF');
    });

    it('should normalize a mid-month date to the month start', async () => {
      const response = await request(httpServer)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body({ month: '2026-05-17T09:30:00.000Z' }))
        .responseType('blob')
        .expect(200);

      // The report is dated the 1st — finding it at all proves the transform ran.
      expect(response.headers['content-disposition']).toContain('2026-05');
    });

    it('should map a missing VAT rate to 400', async () => {
      await prisma.vatRate.deleteMany();

      await request(httpServer)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body())
        .expect(400);
    });

    it('should map incomplete company settings to 400', async () => {
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { companyNumber: null },
      });

      await request(httpServer)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body())
        .expect(400);
    });

    it('should map no matching reports to 404', async () => {
      await request(httpServer)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body({ clientId: otherClientId }))
        .expect(404);
    });

    it.each([
      ['a missing approvedFor', { approvedFor: undefined }],
      ['an over-long approvedFor', { approvedFor: 'x'.repeat(501) }],
      ['an unsupported language', { lang: 'fr' }],
      ['a non-ISO month', { month: 'not-a-date' }],
      ['an unknown property', { nope: true }],
    ])('should reject %s with 400', async (_label, overrides) => {
      await request(httpServer)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body(overrides))
        .expect(400);
    });
  });
});
