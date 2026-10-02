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
import { InitiatorIncomeRequiredError } from './errors/initiator-income-required.error';
import { InitiatorIncomeTooLowError } from '../project-reports/errors/initiator-income-too-low.error';
import { ExportProjectReportsPdfDto } from './dto/export-project-reports-pdf.dto';
import { ExportClientSimulatedPdfDto } from './dto/export-client-simulated-pdf.dto';
import { BadRequestException } from '@nestjs/common';
import { OPENING_BALANCE_TAG } from 'src/common/constants';

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
  const mockProjectReportsService = {
    findOneForExport: jest.fn(),
    findProjectReportsInMonth: jest.fn(),
  };
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
    pdfPrimaryColor: '#1f2a44',
    pdfSecondaryColor: '#c9a24b',
    pdfFont: 'noto-sans-hebrew',
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
      requesterName: 'Moshe Cohen',
      initiatorName: null,
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
    supplierPayments: [
      {
        id: 'cp-1',
        amount: 219768.5,
        vatPercentage: 18,
        vatAmount: 39558.33,
        effectiveTotal: 259326.83,
        supplier: { id: 'corp-1', name: 'Sheq Sin Corp' },
      },
      {
        id: 'cp-2',
        amount: 338012,
        vatPercentage: 18,
        vatAmount: 60842.16,
        effectiveTotal: 398854.16,
        supplier: { id: 'corp-2', name: 'Sahlav Corp' },
      },
      {
        id: 'cp-3',
        amount: 11284,
        vatPercentage: 18,
        vatAmount: 2031.12,
        effectiveTotal: 13315.12,
        supplier: { id: 'corp-3', name: 'Django Corp' },
      },
    ],
    initiatorIncome: null as number | null,
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

  const renderHtml = async (
    overrides: Partial<ExportProjectReportsPdfDto> = {},
  ): Promise<string> => {
    const puppeteer = jest.requireMock<{ launch: jest.Mock }>('puppeteer');
    const mockPage = {
      setContent: jest.fn<void, [string, unknown]>(),
      pdf: jest.fn().mockResolvedValue(Uint8Array.from([1])),
    };
    puppeteer.launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    });

    await service.exportProjectReportsPdf({ ...dto, ...overrides });

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

  // The description belongs to the document, not to the project: the dialog
  // seeds it from the project but the export never writes it back — the
  // projects screen is the only place the project's own description changes.
  describe('per-document description', () => {
    it("prints the description it was given, not the project's stored one", async () => {
      mockProjectReportsService.findOneForExport.mockResolvedValue({
        ...mockReport,
        project: { ...mockReport.project, description: 'Stored description' },
      });

      const html = await renderHtml({ description: 'Shell works only' });

      expect(html).toContain('Shell works only');
      expect(html).not.toContain('Stored description');
    });

    it('prints the location after the description as "description • location"', async () => {
      mockProjectReportsService.findOneForExport.mockResolvedValue({
        ...mockReport,
        project: { ...mockReport.project, location: 'Ashkelon, plot 309' },
      });

      const html = await renderHtml({ description: 'Shell works only' });

      expect(html).toContain('Shell works only • Ashkelon, plot 309');
    });

    it('prints the location alone when no description was given', async () => {
      mockProjectReportsService.findOneForExport.mockResolvedValue({
        ...mockReport,
        project: { ...mockReport.project, location: 'Ashkelon, plot 309' },
      });

      const html = await renderHtml();

      expect(html).toMatch(
        /<span class="label">תיאור הפרויקט:<\/span><span>Ashkelon, plot 309<\/span>/,
      );
    });

    it('leaves the row out entirely when no description was given', async () => {
      const html = await renderHtml();

      expect(html).not.toContain('תיאור הפרויקט:');
    });

    it('treats a whitespace-only description as none', async () => {
      const html = await renderHtml({ description: '   ' });

      expect(html).not.toContain('תיאור הפרויקט:');
    });

    it('writes nothing to the project beyond the remembered approval text', async () => {
      await renderHtml({ description: 'Shell works only' });

      expect(mockProjectsService.updateLastApprovedFor).toHaveBeenCalledTimes(
        1,
      );
      expect(mockProjectsService.updateLastApprovedFor).toHaveBeenCalledWith(
        'project-1',
        dto.approvedFor,
      );
    });
  });

  it('should name the project once, in the info box rather than per row', async () => {
    const html = await renderHtml();

    expect(html.split('Wine City, plot 309 — Ashkelon').length - 1).toBe(1);
  });

  it("should print the project's requester in place of the client, and never print the client's name", async () => {
    const html = await renderHtml();

    expect(html).toContain('Moshe Cohen');
    expect(html).not.toContain('Bar Yam Ltd.');
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

  it('exports without approvedFor, printing the project name alone and remembering nothing', async () => {
    const html = await renderHtml({ approvedFor: undefined });

    expect(html).toContain(mockReport.project.name);
    expect(mockProjectsService.updateLastApprovedFor).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only approvedFor as empty', async () => {
    await service.exportProjectReportsPdf({ ...dto, approvedFor: '   ' });

    expect(mockProjectsService.updateLastApprovedFor).not.toHaveBeenCalled();
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

  // The single-report document is the customer's fixed reference layout: what
  // only the client-simulated export adds (income status, profit line) must
  // not leak into it.
  it('should not add the simulated export’s screen details to the single-report layout', async () => {
    const html = await renderHtml();

    expect(html).not.toContain('התקבל'); // received
    expect(html).not.toContain('ממתין'); // pending
    expect(html).not.toContain('(5%)'); // the "Profit (x%)" summary line
    expect(html).not.toContain('class="sim-badge"');
  });

  it('should translate the opening-balance tag rather than print the stored English one', async () => {
    mockProjectReportsService.findOneForExport.mockResolvedValue({
      ...mockReport,
      incomeEntries: [
        {
          id: 'entry-1',
          amount: 1000,
          incomeDate: null,
          tag: OPENING_BALANCE_TAG,
        },
      ],
    });

    const html = await renderHtml();

    expect(html).toContain('יתרת פתיחה');
    expect(html).not.toContain(OPENING_BALANCE_TAG);
  });

  // Gating: the initiator block is absent, name-only, or name+rows,
  // strictly following whether the project has an initiator and whether it
  // has payments this month. Never an empty heading, never a zero row.
  describe('initiator block gating', () => {
    // The report renders in Hebrew by default (dto carries no `lang`), so the
    // label under test is the Hebrew one — 'יזם:'.
    it('renders no initiator block at all when the project has no initiator', async () => {
      const html = await renderHtml();

      expect(html).not.toContain('יזם:');
      expect(html).not.toContain('Yaniv Goldman');
    });

    it("prints the initiator's name when the project has one", async () => {
      mockProjectReportsService.findOneForExport.mockResolvedValue({
        ...mockReport,
        project: { ...mockReport.project, initiatorName: 'Yaniv Goldman' },
        initiatorIncome: 2000000,
      });

      const html = await renderHtml();

      expect(html).toContain('יזם:');
      expect(html).toContain('Yaniv Goldman');
      // The initiator is the first line of the info box, above the client.
      const infoBox = html.slice(html.indexOf('class="info-box"'));
      expect(infoBox.indexOf('יזם:')).toBeLessThan(
        infoBox.indexOf('שם המזמין:'),
      );
    });

    it('renders the initiator block in English when lang is en', async () => {
      const puppeteer = jest.requireMock<{ launch: jest.Mock }>('puppeteer');
      const mockPage = {
        setContent: jest.fn<void, [string, unknown]>(),
        pdf: jest.fn().mockResolvedValue(Uint8Array.from([1])),
      };
      puppeteer.launch.mockResolvedValue({
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      });
      mockProjectReportsService.findOneForExport.mockResolvedValue({
        ...mockReport,
        project: { ...mockReport.project, initiatorName: 'Yaniv Goldman' },
        initiatorIncome: 2000000,
      });

      await service.exportProjectReportsPdf({ ...dto, lang: 'en' });
      const html = mockPage.setContent.mock.calls[0][0];

      expect(html).toContain('Initiator:');
      expect(html).toContain('Yaniv Goldman');
    });

    it('renders the initiator income as a table column spanning every income row', async () => {
      mockProjectReportsService.findOneForExport.mockResolvedValue({
        ...mockReport,
        project: { ...mockReport.project, initiatorName: 'Yaniv Goldman' },
        initiatorIncome: 2000000,
      });

      const html = await renderHtml();

      // Header sits just before the approved amount (to its right in RTL),
      // and the figure is one cell spanning all rows, not an info-box line.
      expect(html).toMatch(
        /<th>חשבון שאושר ע"י מזמין<\/th>\s*<th>חשבון שאושר ע"י מזמין<\/th>/,
      );
      expect(html).toContain(
        `rowspan="${mockReport.incomeEntries.length}">2,000,000.00 ₪`,
      );
      expect(html.match(/2,000,000\.00/g)).toHaveLength(1);
      expect(html).not.toContain('חשבון שאושר ע"י מזמין:');
    });

    it('renders no initiator income column when the project has no initiator', async () => {
      const html = await renderHtml();

      expect(html.match(/<th>חשבון שאושר ע"י מזמין<\/th>/g)).toHaveLength(1);
    });

    it('refuses to export when the project has an initiator but initiatorIncome is not set', async () => {
      mockProjectReportsService.findOneForExport.mockResolvedValue({
        ...mockReport,
        project: { ...mockReport.project, initiatorName: 'Yaniv Goldman' },
        initiatorIncome: null,
      });

      await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
        InitiatorIncomeRequiredError,
      );
    });

    it('refuses to export when initiatorIncome no longer exceeds the report income', async () => {
      mockProjectReportsService.findOneForExport.mockResolvedValue({
        ...mockReport,
        project: { ...mockReport.project, initiatorName: 'Yaniv Goldman' },
        initiatorIncome: mockReport.totalIncome,
      });

      await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
        InitiatorIncomeTooLowError,
      );
    });

    it('exports fine without initiatorIncome when the project has no initiator', async () => {
      await expect(service.exportProjectReportsPdf(dto)).resolves.toBeDefined();
    });
  });

  // Client-wide simulated export: summary page + one detail page per
  // project, all of a client's reports for the month, at simulated margins.
  describe('exportClientSimulatedPdf', () => {
    const simDto: ExportClientSimulatedPdfDto = {
      clientId: 'client-1',
      month: '2026-03-01',
      overrides: [{ projectId: 'project-1', margin: 15 }],
    };

    const baseProjectFields = {
      description: 'A project',
      location: 'Somewhere',
      requesterName: 'Moshe Cohen',
      initiatorName: null,
    };

    const reportsForClient1 = [
      {
        id: 'report-1',
        date: '2026-03-01T00:00:00.000Z',
        profitMargin: 10, // saved — overridden to 15 by simDto
        totalIncome: 10000,
        project: {
          id: 'project-1',
          name: 'Tower Block',
          client: { id: 'client-1', name: 'Acme Corp' },
          ...baseProjectFields,
        },
        subcontractor: { id: 'sub-1', name: 'Israelov Engineering' },
        incomeEntries: [
          { id: 'e1', amount: 10000, incomeDate: null, tag: null },
        ],
        supplierPayments: [
          {
            id: 'sp1',
            amount: 1000,
            vatPercentage: 18,
            vatAmount: 180,
            effectiveTotal: 1180,
            supplier: { id: 's1', name: 'Flooring Ltd' },
          },
        ],
      },
      {
        id: 'report-2',
        date: '2026-03-01T00:00:00.000Z',
        profitMargin: 20, // saved — no override, stays 20
        totalIncome: 5000,
        project: {
          id: 'project-2',
          name: 'Riverside',
          client: { id: 'client-1', name: 'Acme Corp' },
          ...baseProjectFields,
        },
        subcontractor: { id: 'sub-2', name: 'Bar Yam Builders' },
        incomeEntries: [
          { id: 'e2', amount: 5000, incomeDate: null, tag: null },
        ],
        supplierPayments: [],
      },
      {
        id: 'report-3',
        date: '2026-03-01T00:00:00.000Z',
        profitMargin: 10,
        totalIncome: 2000,
        project: {
          id: 'project-3',
          name: 'Other Client Project',
          client: { id: 'client-2', name: 'Other Client' },
          ...baseProjectFields,
        },
        subcontractor: { id: 'sub-3', name: 'Someone Else' },
        incomeEntries: [
          { id: 'e3', amount: 2000, incomeDate: null, tag: null },
        ],
        supplierPayments: [],
      },
    ];

    beforeEach(() => {
      mockProjectReportsService.findProjectReportsInMonth.mockResolvedValue(
        reportsForClient1,
      );
      mockSubcontractorsService.findOne.mockImplementation(
        (id: string) =>
          Promise.resolve({
            id,
            name:
              reportsForClient1.find((r) => r.subcontractor.id === id)
                ?.subcontractor.name ?? 'Unknown',
            companyNumber: '000000000',
          }) as unknown,
      );
    });

    const renderSimHtml = async (
      dto: ExportClientSimulatedPdfDto = simDto,
    ): Promise<string> => {
      const puppeteer = jest.requireMock<{ launch: jest.Mock }>('puppeteer');
      const mockPage = {
        setContent: jest.fn<void, [string, unknown]>(),
        pdf: jest.fn().mockResolvedValue(Uint8Array.from([1])),
      };
      puppeteer.launch.mockResolvedValue({
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      });

      await service.exportClientSimulatedPdf(dto);

      return mockPage.setContent.mock.calls[0][0];
    };

    it('should throw CompanySettingsIncompleteError when settings are incomplete', async () => {
      mockCompanySettingsService.findOne.mockResolvedValue(null);

      await expect(service.exportClientSimulatedPdf(simDto)).rejects.toThrow(
        CompanySettingsIncompleteError,
      );
    });

    it('should throw NoReportsForExportError when the client has no reports this month', async () => {
      mockProjectReportsService.findProjectReportsInMonth.mockResolvedValue([]);

      await expect(service.exportClientSimulatedPdf(simDto)).rejects.toThrow(
        NoReportsForExportError,
      );
    });

    it('should throw NoReportsForExportError when only other clients have reports this month', async () => {
      mockProjectReportsService.findProjectReportsInMonth.mockResolvedValue([
        reportsForClient1[2], // client-2 only
      ]);

      await expect(service.exportClientSimulatedPdf(simDto)).rejects.toThrow(
        NoReportsForExportError,
      );
    });

    it("should reject an override for a project that is not this client's", async () => {
      await expect(
        service.exportClientSimulatedPdf({
          ...simDto,
          overrides: [{ projectId: 'project-3', margin: 15 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw VatRateNotConfiguredError when no VAT rate resolves for the month', async () => {
      mockVatRatesService.resolveForMonth.mockResolvedValue(null);

      await expect(service.exportClientSimulatedPdf(simDto)).rejects.toThrow(
        VatRateNotConfiguredError,
      );
    });

    it('should cover every report of the client for the month, and none of another client', async () => {
      const html = await renderSimHtml();

      expect(html).toContain('Tower Block');
      expect(html).toContain('Riverside');
      expect(html).not.toContain('Other Client Project');
    });

    it('normalizes a date-only month before querying reports, since findProjectReportsInMonth is normally reached through a DTO whose @Transform does that widening', async () => {
      await renderSimHtml();

      expect(
        mockProjectReportsService.findProjectReportsInMonth,
      ).toHaveBeenCalledWith({
        month: expect.stringMatching(/^2026-03-01T00:00:00/) as unknown,
      });
    });

    it('computes figures at the simulated margin where overridden, and the stored margin otherwise', async () => {
      const html = await renderSimHtml();

      // project-1: overridden to 15% -> profit 1,500, supplier 1,000,
      // subcontractor remainder 10,000 - 1,500 - 1,000 = 7,500.
      expect(html).toContain('7,500.00');
      // project-2: no override, stays at its saved 20% -> profit 1,000,
      // no supplier deductions, subcontractor remainder 5,000 - 1,000 = 4,000.
      expect(html).toContain('4,000.00');
    });

    it('renders a detail page per project after the summary page', async () => {
      const html = await renderSimHtml();

      // Both project names appear once in the summary table, and again on
      // their own detail page's info box / title area — at least twice each.
      expect(html.split('Tower Block').length - 1).toBeGreaterThanOrEqual(2);
      expect(html.split('Riverside').length - 1).toBeGreaterThanOrEqual(2);
    });

    // 🔴 The test that defines this task: exporting with overrides must never
    // touch stored data. This service method has no write path at all — the
    // only persistence call anywhere in this service is updateLastApprovedFor,
    // used exclusively by the single-report export.
    it('does not persist anything — no stored profitMargin or approvedFor is touched', async () => {
      await renderSimHtml();

      expect(mockProjectsService.updateLastApprovedFor).not.toHaveBeenCalled();
    });

    it('renders in the requested language', async () => {
      const puppeteer = jest.requireMock<{ launch: jest.Mock }>('puppeteer');
      const mockPage = {
        setContent: jest.fn<void, [string, unknown]>(),
        pdf: jest.fn().mockResolvedValue(Uint8Array.from([1])),
      };
      puppeteer.launch.mockResolvedValue({
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn(),
      });

      await service.exportClientSimulatedPdf({ ...simDto, lang: 'en' });
      const html = mockPage.setContent.mock.calls[0][0];

      expect(html).toContain('Simulated Profit Report');
    });

    // The document mirrors the Reports screen: everything below is something
    // that screen shows for a project, and the export used to leave out.
    describe('mirrors the Reports screen', () => {
      const withProject1 = (patch: Record<string, unknown>) =>
        mockProjectReportsService.findProjectReportsInMonth.mockResolvedValue([
          { ...reportsForClient1[0], ...patch },
          reportsForClient1[1],
        ]);

      it("shows the stored margin and profit beside a simulated project's, and only there", async () => {
        const html = await renderSimHtml({ ...simDto, lang: 'en' });

        // project-1 moved 10% -> 15%; project-2 keeps its stored 20%.
        expect(html.split('class="cell-sub">Saved:').length - 1).toBe(2);
        expect(html).toContain('Saved: 10%');
        expect(html).toContain('Saved: 1,000.00 ₪');
        expect(html.split('class="sim-badge"').length - 1).toBe(2); // summary row + detail page
      });

      it('totals the simulated profit against the stored one', async () => {
        const html = await renderSimHtml({ ...simDto, lang: 'en' });

        // simulated 1,500 + 1,000; stored 1,000 + 1,000.
        expect(html).toContain('Simulated Profit');
        expect(html).toContain('Saved Profit');
        expect(html).toContain('Delta vs Saved');
        expect(html).toContain('+500.00 ₪');
      });

      it('shows a negative delta with a minus sign', async () => {
        const html = await renderSimHtml({
          ...simDto,
          lang: 'en',
          overrides: [{ projectId: 'project-1', margin: 5 }],
        });

        expect(html).toContain('−500.00 ₪'); // 500 vs the stored 1,000
        expect(html).toContain('delta-down');
      });

      it('leaves out the stored-profit and delta lines when nothing was simulated', async () => {
        const html = await renderSimHtml({
          ...simDto,
          lang: 'en',
          overrides: [],
        });

        expect(html).toContain('Simulated Profit');
        expect(html).not.toContain('Saved Profit');
        expect(html).not.toContain('Delta vs Saved');
        expect(html).not.toContain('class="sim-badge"');
        expect(html).not.toContain('class="cell-sub">Saved:');
      });

      it("prints each project's location, description and subcontractor", async () => {
        withProject1({
          project: {
            ...reportsForClient1[0].project,
            location: 'Ashkelon, plot 309',
            description: 'Lobby renovation',
          },
        });

        const html = await renderSimHtml({ ...simDto, lang: 'en' });

        // Location: once on the summary row, once on the detail page,
        // where it follows the description.
        expect(html.split('Ashkelon, plot 309').length - 1).toBe(2);
        expect(html).toContain('Lobby renovation • Ashkelon, plot 309');
        expect(html).toContain('Subcontractor: Israelov Engineering');
      });

      it('marks each income entry received (with its date) or pending', async () => {
        withProject1({
          incomeEntries: [
            {
              id: 'e1',
              amount: 6000,
              incomeDate: '2026-03-10T00:00:00.000Z',
              tag: 'Frame',
            },
            { id: 'e1b', amount: 4000, incomeDate: null, tag: 'Finish' },
          ],
        });

        const html = await renderSimHtml({ ...simDto, lang: 'en' });

        expect(html).toContain('Received 10/03/2026');
        expect(html).toContain('<td>Pending</td>');
      });

      it('adds the sheet’s profit line, at the margin in force, to each monthly summary', async () => {
        const html = await renderSimHtml({ ...simDto, lang: 'en' });

        expect(html).toContain('Profit (15%)'); // project-1, simulated
        expect(html).toContain('Profit (20%)'); // project-2, stored
      });

      it('translates the opening-balance tag', async () => {
        withProject1({
          incomeEntries: [
            {
              id: 'e1',
              amount: 10000,
              incomeDate: null,
              tag: OPENING_BALANCE_TAG,
            },
          ],
        });

        const html = await renderSimHtml({ ...simDto, lang: 'he' });

        expect(html).toContain('יתרת פתיחה');
        expect(html).not.toContain(OPENING_BALANCE_TAG);
      });

      it('does not open the approved-for row with a stray bullet when there is no approval text', async () => {
        const html = await renderSimHtml({ ...simDto, lang: 'en' });

        expect(html).not.toMatch(/<span>\s*•/);
      });
    });
  });
});
