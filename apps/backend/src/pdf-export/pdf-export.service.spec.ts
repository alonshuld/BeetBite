import { Test, TestingModule } from '@nestjs/testing';
import { PdfExportService } from './pdf-export.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { ProjectReportsService } from 'src/project-reports/project-reports.service';
import { SubcontractorsService } from 'src/subcontractors/subcontractors.service';
import { ProjectsService } from 'src/projects/projects.service';
import { CompanySettingsIncompleteError } from './errors/company-settings-incomplete.error';
import { VatRateNotConfiguredError } from './errors/vat-rate-not-configured.error';
import { NoReportsForExportError } from './errors/no-reports-for-export.error';
import { ExportProjectReportsPdfDto } from './dto/export-project-reports-pdf.dto';

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3])),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('PdfExportService', () => {
  let service: PdfExportService;

  const mockCompanySettingsService = { findOne: jest.fn() };
  const mockVatRatesService = { resolveForMonth: jest.fn() };
  const mockProjectReportsService = { findOneForExport: jest.fn() };
  const mockSubcontractorsService = { findOne: jest.fn() };
  const mockProjectsService = { updateLastApprovedFor: jest.fn() };

  const completeCompanySettings = {
    id: 'company-settings',
    name: 'Acme Construction Ltd.',
    description: 'Residential and urban renewal',
    companyNumber: '515123456',
    phone: '+972501234567',
    email: 'info@acme.com',
    addressStreet: '12 Herzl St.',
    addressCity: 'Tel Aviv',
    logo: null,
    signature: null,
    updatedAt: '2026-04-01T00:00:00.000Z',
  };

  const dto: ExportProjectReportsPdfDto = {
    projectReportId: 'report-1',
    approvedFor: 'Shell + finishing work',
  };

  /**
   * Mirrors the customer's reference document: two tagged income entries on one
   * report, against three supplier deductions.
   */
  const mockReport = {
    id: 'report-1',
    project: {
      id: 'project-1',
      name: 'Wine City, plot 309 — Ashkelon',
      client: { id: 'client-1', name: 'Bar Yam Ltd.' },
    },
    subcontractor: { id: 'sub-1', name: 'Israelov Engineering' },
    date: '2026-03-01T00:00:00.000Z',
    profitMargin: 5,
    totalIncome: 1588835,
    incomeEntries: [
      {
        id: 'entry-1',
        amount: 867996,
        incomeDate: '2026-03-10T00:00:00.000Z',
        tag: 'שלד',
      },
      {
        id: 'entry-2',
        amount: 720839,
        incomeDate: null,
        tag: 'גמר',
      },
    ],
    corporationPayments: [
      {
        id: 'cp-1',
        amount: 219768.5,
        vatPercentage: 18,
        vatAmount: 39558.33,
        effectiveTotal: 259326.83,
        corporation: { id: 'corp-1', name: 'Sheq Sin Corp' },
      },
      {
        id: 'cp-2',
        amount: 338012,
        vatPercentage: 18,
        vatAmount: 60842.16,
        effectiveTotal: 398854.16,
        corporation: { id: 'corp-2', name: 'Sahlav Corp' },
      },
      {
        id: 'cp-3',
        amount: 11284,
        vatPercentage: 18,
        vatAmount: 2031.12,
        effectiveTotal: 13315.12,
        corporation: { id: 'corp-3', name: 'Django Corp' },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfExportService,
        {
          provide: CompanySettingsService,
          useValue: mockCompanySettingsService,
        },
        { provide: VatRatesService, useValue: mockVatRatesService },
        { provide: ProjectReportsService, useValue: mockProjectReportsService },
        { provide: SubcontractorsService, useValue: mockSubcontractorsService },
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    service = module.get<PdfExportService>(PdfExportService);
    jest.clearAllMocks();

    mockCompanySettingsService.findOne.mockResolvedValue(
      completeCompanySettings,
    );
    mockVatRatesService.resolveForMonth.mockResolvedValue(18);
    mockProjectReportsService.findOneForExport.mockResolvedValue(mockReport);
    mockSubcontractorsService.findOne.mockResolvedValue({
      id: 'sub-1',
      name: 'Israelov Engineering',
      companyNumber: '516469053',
    });
    mockProjectsService.updateLastApprovedFor.mockResolvedValue(undefined);
  });

  const renderHtml = async (): Promise<string> => {
    const puppeteer = jest.requireMock<{ launch: jest.Mock }>('puppeteer');
    const mockPage = {
      setContent: jest.fn<void, [string, unknown]>(),
      pdf: jest.fn().mockResolvedValue(Uint8Array.from([1])),
    };
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    });

    await service.exportProjectReportsPdf(dto);

    return mockPage.setContent.mock.calls[0][0];
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw CompanySettingsIncompleteError when name is missing', async () => {
    mockCompanySettingsService.findOne.mockResolvedValue({
      ...completeCompanySettings,
      name: null,
    });

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      CompanySettingsIncompleteError,
    );
  });

  it('should throw CompanySettingsIncompleteError when companyNumber is missing', async () => {
    mockCompanySettingsService.findOne.mockResolvedValue({
      ...completeCompanySettings,
      companyNumber: null,
    });

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      CompanySettingsIncompleteError,
    );
  });

  it('should throw CompanySettingsIncompleteError when settings were never configured', async () => {
    mockCompanySettingsService.findOne.mockResolvedValue(null);

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      CompanySettingsIncompleteError,
    );
  });

  it('should throw VatRateNotConfiguredError when no VAT rate resolves for the month', async () => {
    mockVatRatesService.resolveForMonth.mockResolvedValue(null);

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      VatRateNotConfiguredError,
    );
  });

  it('should throw NoReportsForExportError when the report does not exist', async () => {
    mockProjectReportsService.findOneForExport.mockRejectedValue(
      new Error('not found'),
    );

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      NoReportsForExportError,
    );
  });

  it('should fetch exactly the requested report', async () => {
    await service.exportProjectReportsPdf(dto);

    expect(mockProjectReportsService.findOneForExport).toHaveBeenCalledWith(
      'report-1',
    );
  });

  it("should resolve VAT from the report's own month, not a caller-supplied one", async () => {
    await service.exportProjectReportsPdf(dto);

    expect(mockVatRatesService.resolveForMonth).toHaveBeenCalledWith(
      mockReport.date,
    );
  });

  it('should render a non-empty PDF buffer and report the month', async () => {
    const result = await service.exportProjectReportsPdf(dto);

    expect(Buffer.isBuffer(result.pdf)).toBe(true);
    expect(result.pdf.length).toBeGreaterThan(0);
    expect(result.month).toBe(mockReport.date);
  });

  it('should compute per-entry figures matching the reference document math', async () => {
    // Verified against the customer's March 2026 approval:
    //   867,996 × 1.18 = 1,024,235.28   |  5% = 43,399.80  |  → 824,596.20
    //   720,839 × 1.18 =   850,590.02   |  5% = 36,041.95  |  → 684,797.05
    const html = await renderHtml();

    expect(html).toContain('1,024,235.28');
    expect(html).toContain('43,399.80');
    expect(html).toContain('824,596.20');
    expect(html).toContain('850,590.02');
    expect(html).toContain('36,041.95');
    expect(html).toContain('684,797.05');
  });

  it('should total income, deductions and payment across the entries', async () => {
    // income 1,588,835 → afterProfit 1,509,393.25 − suppliers 569,064.50
    //   = 940,328.75 → × 1.18 = 1,109,587.93
    const html = await renderHtml();

    expect(html).toContain('1,588,835.00');
    expect(html).toContain('1,509,393.25');
    expect(html).toContain('569,064.50');
    expect(html).toContain('940,328.75');
    expect(html).toContain('1,109,587.93');
  });

  it("should render each income entry's own tag in the tag column", async () => {
    const html = await renderHtml();

    expect(html).toContain('<td>שלד</td>');
    expect(html).toContain('<td>גמר</td>');
  });

  it('should name the project once, in the info box rather than per row', async () => {
    const html = await renderHtml();

    expect(html.split('Wine City, plot 309 — Ashkelon').length - 1).toBe(1);
  });

  it('should list suppliers in their own table, independent of the income rows', async () => {
    // Three suppliers against two income entries: the supplier table runs to
    // its own length instead of being paired against the income rows.
    const html = await renderHtml();

    expect(html).toContain('Sheq Sin Corp');
    expect(html).toContain('Sahlav Corp');
    expect(html).toContain('Django Corp');

    const [, incomeTable] = html.split('<table>');
    expect(incomeTable.split('<tr>').length - 1).toBe(3); // header + 2 entries
  });

  it('should render without a tag when an entry is untagged', async () => {
    mockProjectReportsService.findOneForExport.mockResolvedValue({
      ...mockReport,
      incomeEntries: [
        { id: 'entry-1', amount: 1000, incomeDate: null, tag: null },
      ],
    });

    // The column still renders, just empty.
    expect(await renderHtml()).toContain('<td></td>');
  });

  it("should persist approvedFor onto the report's project after a successful export", async () => {
    await service.exportProjectReportsPdf(dto);

    expect(mockProjectsService.updateLastApprovedFor).toHaveBeenCalledWith(
      'project-1',
      dto.approvedFor,
    );
  });

  it('should not persist approvedFor when company settings are incomplete', async () => {
    mockCompanySettingsService.findOne.mockResolvedValue(null);

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      CompanySettingsIncompleteError,
    );
    expect(mockProjectsService.updateLastApprovedFor).not.toHaveBeenCalled();
  });

  it('should not persist approvedFor when no VAT rate resolves for the month', async () => {
    mockVatRatesService.resolveForMonth.mockResolvedValue(null);

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      VatRateNotConfiguredError,
    );
    expect(mockProjectsService.updateLastApprovedFor).not.toHaveBeenCalled();
  });

  it('should not persist approvedFor when the report does not exist', async () => {
    mockProjectReportsService.findOneForExport.mockRejectedValue(
      new Error('not found'),
    );

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      NoReportsForExportError,
    );
    expect(mockProjectsService.updateLastApprovedFor).not.toHaveBeenCalled();
  });

  it('should not persist approvedFor when PDF rendering itself fails', async () => {
    const puppeteer = jest.requireMock<{ launch: jest.Mock }>('puppeteer');
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockRejectedValue(new Error('render failed')),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    });

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      'render failed',
    );
    expect(mockProjectsService.updateLastApprovedFor).not.toHaveBeenCalled();
  });

  it('should escape HTML in a tag', async () => {
    mockProjectReportsService.findOneForExport.mockResolvedValue({
      ...mockReport,
      incomeEntries: [
        {
          id: 'entry-1',
          amount: 1000,
          incomeDate: null,
          tag: '<script>alert(1)</script>',
        },
      ],
    });

    const html = await renderHtml();

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
