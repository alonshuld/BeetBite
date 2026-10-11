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
import type { Server } from 'http';
import * as path from 'path';
import request from 'supertest';

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
 * Integration coverage for the account-approval PDF export.
 *
 * The export is scoped to a single project report: its id is the entire
 * request, the month on the document is the report's own date, and the table
 * rows are that report's income entries, each carrying its own tag.
 *
 * `pdf-export.service.spec.ts` covers the service's branching with every
 * collaborator mocked. This suite is the complement — real Postgres, real
 * services, real template — so the lookup, VAT carry-forward and rendering are
 * exercised against actual rows, and the controller is driven over HTTP through
 * the same pipes and filters as production.
 *
 * Puppeteer is stubbed and the HTML handed to `setContent` is captured. It
 * stays stubbed so this suite needs no browser: proof that a real browser
 * renders a real PDF lives in `apps/e2e/tests/pdf-export.spec.ts`.
 */

// Vitest hoists `vi.mock` above the imports, so the state its factory closes
// over has to be hoisted with it.
const mockPuppeteerState = vi.hoisted(() => ({ html: '' }));

// Plain promise-returning functions rather than `async` ones: none of them
// await anything, and the `typescript/require-await` lint rule rejects that.
vi.mock('puppeteer', () => ({
  default: {
    launch: () =>
      Promise.resolve({
        newPage: () =>
          Promise.resolve({
            setContent: (html: string) => {
              mockPuppeteerState.html = html;
              return Promise.resolve();
            },
            // '%PDF' — enough for the controller's Content-Length assertion.
            pdf: () =>
              Promise.resolve(Uint8Array.from([0x25, 0x50, 0x44, 0x46])),
          }),
        close: () => Promise.resolve(),
      }),
  },
}));

const JWT_SECRET = 'pdf-export-e2e-secret-at-least-32-characters';
const SETTINGS_ID = 'company-settings';

const MONTH = '2026-05-01T00:00:00.000Z';
const PREVIOUS_MONTH = '2026-04-01T00:00:00.000Z';
const NEXT_MONTH = '2026-06-01T00:00:00.000Z';

const BASELINE_VAT_MONTH = new Date('2020-01-01T00:00:00.000Z');
const BASELINE_VAT = 18;

describe('PDF Export Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let moduleRef: TestingModule;
  let service: PdfExportService;
  let prisma: PrismaService;
  let app: INestApplication<Server>;
  let token: string;

  let clientId: string;
  let projectId: string;
  let subcontractorId: string;
  let supplierId: string;
  /** The report under test, set by `seedDefaultReport`. */
  let reportId: string;

  const exportDto = (
    overrides: Partial<ExportProjectReportsPdfDto> = {},
  ): ExportProjectReportsPdfDto => ({
    projectReportId: reportId,
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
        requesterName: `${name} requester`,
        location: `${name} location`,
      },
    });

  /** Creates a report with tagged income entries and optional supplier rows. */
  const seedReport = async (opts: {
    projectId?: string;
    date?: string;
    profitMargin?: number;
    incomes: Array<{ amount: number; tag?: string | null }>;
    supplierPayments?: Array<{ supplierId: string; amount: number }>;
  }) =>
    prisma.projectReport.create({
      data: {
        projectId: opts.projectId ?? projectId,
        subcontractorId,
        date: new Date(opts.date ?? MONTH),
        profitMargin: opts.profitMargin ?? 10,
        incomeEntries: {
          create: opts.incomes.map((entry) => ({
            amount: entry.amount,
            tag: entry.tag ?? null,
          })),
        },
        ...(opts.supplierPayments
          ? {
              supplierPayments: {
                create: opts.supplierPayments.map((payment) => ({
                  supplierId: payment.supplierId,
                  amount: payment.amount,
                  date: new Date(opts.date ?? MONTH),
                })),
              },
            }
          : {}),
      },
    });

  /** A single 10,000 income entry at a 10% margin, and the report under test. */
  const seedDefaultReport = async () => {
    const report = await seedReport({ incomes: [{ amount: 10000 }] });
    reportId = report.id;
    return report;
  };

  /** Formats a number the way the template's currency helper does. */
  const money = (amount: number): string =>
    `${amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₪`;

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

    token = moduleRef
      .get(JwtService)
      .sign({ sub: 'test-user-id', username: 'tester' });
  });

  beforeEach(async () => {
    clientId = (await prisma.client.create({ data: { name: 'Acme Homes' } }))
      .id;
    projectId = (await createProject('Tower A')).id;
    subcontractorId = (
      await prisma.subcontractor.create({
        data: { name: 'Dan Builder', companyNumber: '515111222' },
      })
    ).id;
    supplierId = (
      await prisma.supplier.create({ data: { name: 'Flooring Ltd' } })
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
    await prisma.supplierPayment.deleteMany();
    await prisma.projectReportIncome.deleteMany();
    await prisma.projectReport.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    await prisma.subcontractor.deleteMany();
    await prisma.subcontractorTeam.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.vatRate.deleteMany();
    await prisma.companySettings.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
    await container.stop();
  });

  // ==========================================================================
  // Row sourcing — one row per income entry of the requested report
  // ==========================================================================

  describe('Row sourcing', () => {
    it('should render one row per income entry', async () => {
      const report = await seedReport({
        incomes: [
          { amount: 4000, tag: 'Foundations' },
          { amount: 6000, tag: 'Framing' },
        ],
      });
      reportId = report.id;

      const html = await renderHtml();

      expect(html).toContain('Foundations');
      expect(html).toContain('Framing');
      expect(html).toContain(money(4000));
      expect(html).toContain(money(6000));
    });

    it("should ignore another report's income entries", async () => {
      const other = await createProject('Tower B');
      await seedReport({
        projectId: other.id,
        incomes: [{ amount: 99999, tag: 'Not mine' }],
      });
      await seedDefaultReport();

      const html = await renderHtml();

      expect(html).not.toContain('Not mine');
      expect(html).not.toContain(money(99999));
    });

    it('should render an empty tag cell for an untagged entry', async () => {
      const report = await seedReport({
        incomes: [{ amount: 5000, tag: null }],
      });
      reportId = report.id;

      const html = await renderHtml();

      expect(html).toContain(money(5000));
      expect(html).toContain('<td></td>');
    });

    it('should escape HTML in a tag', async () => {
      const report = await seedReport({
        incomes: [{ amount: 5000, tag: '<b>bold</b> & "quoted"' }],
      });
      reportId = report.id;

      const html = await renderHtml();

      expect(html).toContain(
        '&lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot;',
      );
      expect(html).not.toContain('<b>bold</b>');
    });

    it('should throw NoReportsForExportError for an unknown report', async () => {
      reportId = 'does-not-exist';

      await expect(
        service.exportProjectReportsPdf(exportDto()),
      ).rejects.toThrow(NoReportsForExportError);
    });
  });

  // ==========================================================================
  // VAT resolution — the month comes from the report, not the caller
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

      expect(html).toContain(money(11800));
      expect(html).not.toContain(money(12500));
    });

    it("should resolve against the report's own month", async () => {
      // A rate effective in April must apply to an April report even though a
      // newer one exists for May — the caller never names a month.
      const april = await createProject('April Tower');
      const report = await seedReport({
        projectId: april.id,
        date: PREVIOUS_MONTH,
        incomes: [{ amount: 10000 }],
      });
      reportId = report.id;
      await prisma.vatRate.create({
        data: { effectiveMonth: new Date(PREVIOUS_MONTH), percentage: 20 },
      });
      await prisma.vatRate.create({
        data: { effectiveMonth: new Date(MONTH), percentage: 25 },
      });

      const html = await renderHtml();

      expect(html).toContain(money(12000));
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
    it('should total the income entries', async () => {
      const report = await seedReport({
        incomes: [{ amount: 4000 }, { amount: 6000 }],
      });
      reportId = report.id;

      const html = await renderHtml();

      expect(html).toContain(money(10000));
    });

    it('should list supplier rows and their total', async () => {
      const plumbing = await prisma.supplier.create({
        data: { name: 'Plumbing Ltd' },
      });
      const report = await seedReport({
        incomes: [{ amount: 10000 }],
        supplierPayments: [
          { supplierId, amount: 1000 },
          { supplierId: plumbing.id, amount: 2500 },
        ],
      });
      reportId = report.id;

      const html = await renderHtml();

      expect(html).toContain('Flooring Ltd');
      expect(html).toContain('Plumbing Ltd');
      expect(html).toContain(money(3500));
    });

    it('should compute payable excl. and incl. VAT', async () => {
      const report = await seedReport({
        incomes: [{ amount: 10000 }],
        supplierPayments: [{ supplierId, amount: 1000 }],
      });
      reportId = report.id;

      const html = await renderHtml();

      // profit 1,000 → afterProfit 9,000 → less 1,000 supplier → 8,000
      expect(html).toContain(money(8000));
      // 8,000 + 18%
      expect(html).toContain(money(9440));
    });

    it('should render both payable figures inside the highlighted block', async () => {
      const report = await seedReport({
        incomes: [{ amount: 10000 }],
        supplierPayments: [{ supplierId, amount: 1000 }],
      });
      reportId = report.id;

      const html = await renderHtml();

      // Both payable rows share one navy block; the sub-totals above stay plain.
      const block = html.slice(html.indexOf('summary-payable'));
      expect(block).toContain(money(8000));
      expect(block).toContain(money(9440));
      expect(block.indexOf(money(8000))).toBeLessThan(
        block.indexOf(money(9440)),
      );
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

    it('should render the description in the header when set', async () => {
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { description: 'Main contractor for residential builds' },
      });

      const html = await renderHtml();

      expect(html).toContain(
        '<div class="contractor-desc">Main contractor for residential builds</div>',
      );
    });

    it('should omit the description block when unset', async () => {
      const html = await renderHtml();

      expect(html).not.toContain('<div class="contractor-desc">');
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

    it('should paint the configured PDF colors', async () => {
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { pdfPrimaryColor: '#0b6e4f', pdfSecondaryColor: '#e07a5f' },
      });

      const html = await renderHtml();

      expect(html).toContain('background: #0b6e4f;');
      expect(html).toContain('border-bottom: 4px solid #e07a5f;');
      expect(html).not.toContain('#1f2a44');
      expect(html).not.toContain('#c9a24b');
    });

    it('should embed the configured PDF font', async () => {
      await prisma.companySettings.update({
        where: { id: SETTINGS_ID },
        data: { pdfFont: 'frank-ruhl-libre' },
      });

      const html = await renderHtml();

      expect(html).toContain('font-family: "Frank Ruhl Libre",');
      expect(html).toContain('url(data:font/woff2;base64,');
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

    it('should append the project name to the approved-for line', async () => {
      const html = await renderHtml({ approvedFor: 'Shell works' });

      expect(html).toContain('Shell works');
      expect(html).toContain('Tower A');
    });

    it('should name the subcontractor with its company number', async () => {
      const html = await renderHtml();

      expect(html).toContain('Dan Builder');
      expect(html).toContain('515111222');
    });

    it('should name every member of a team project', async () => {
      const partner = await prisma.subcontractor.create({
        data: { name: 'Avi Partner', companyNumber: '515333444' },
      });
      await prisma.subcontractorTeam.create({
        data: {
          members: { connect: [{ id: subcontractorId }, { id: partner.id }] },
        },
      });

      const html = await renderHtml();

      expect(html).toContain('Dan Builder');
      expect(html).toContain('515111222');
      expect(html).toContain('Avi Partner');
      expect(html).toContain('515333444');
    });

    it('should escape HTML in the approved-for text', async () => {
      const html = await renderHtml({
        approvedFor: 'Works & "extras" <b>bold</b>',
      });

      expect(html).toContain(
        'Works &amp; &quot;extras&quot; &lt;b&gt;bold&lt;/b&gt;',
      );
      expect(html).not.toContain('<b>bold</b>');
    });
  });

  // ==========================================================================
  // HTTP surface
  // ==========================================================================

  describe('POST /api/v1/projects/reports/export-pdf', () => {
    const url = '/api/v1/projects/reports/export-pdf';

    const body = (overrides: Record<string, unknown> = {}) => ({
      projectReportId: reportId,
      approvedFor: 'Shell works',
      lang: 'en',
      ...overrides,
    });

    beforeEach(seedDefaultReport);

    it('should reject an unauthenticated request', async () => {
      await request(app.getHttpServer()).post(url).send(body()).expect(401);
    });

    it('should stream the PDF with download headers', async () => {
      const response = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body())
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      // The filename's month comes from the report, not the request.
      expect(response.headers['content-disposition']).toBe(
        'attachment; filename="account-approval-2026-05.pdf"',
      );
      expect(Number(response.headers['content-length'])).toBe(
        (response.body as Buffer).length,
      );
      expect((response.body as Buffer).toString('latin1')).toBe('%PDF');
    });

    it("should name the file after the report's own month", async () => {
      const april = await createProject('April Tower');
      const report = await seedReport({
        projectId: april.id,
        date: PREVIOUS_MONTH,
        incomes: [{ amount: 1000 }],
      });

      const response = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body({ projectReportId: report.id }))
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-disposition']).toContain('2026-04');
    });

    it('should map a missing VAT rate to 400', async () => {
      await prisma.vatRate.deleteMany();

      await request(app.getHttpServer())
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

      await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body())
        .expect(400);
    });

    it('should map an unknown report to 404', async () => {
      await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body({ projectReportId: 'nope' }))
        .expect(404);
    });

    // Optional since the export prints the project name alone when blank.
    it('should accept a missing approvedFor', async () => {
      await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body({ approvedFor: undefined }))
        .expect(200);
    });

    it.each([
      ['a missing projectReportId', { projectReportId: undefined }],
      ['an over-long approvedFor', { approvedFor: 'x'.repeat(501) }],
      ['an unsupported language', { lang: 'fr' }],
      ['an unknown property', { nope: true }],
    ])('should reject %s with 400', async (_label, overrides) => {
      await request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body(overrides))
        .expect(400);
    });
  });
});
