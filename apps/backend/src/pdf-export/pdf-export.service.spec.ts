import { Test, TestingModule } from '@nestjs/testing';
import { PdfExportService } from './pdf-export.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { ProjectReportsService } from 'src/project-reports/project-reports.service';
import { SubcontractorsService } from 'src/subcontractors/subcontractors.service';
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
  const mockProjectReportsService = {
    findForSubcontractorAndClientInMonth: jest.fn(),
  };
  const mockSubcontractorsService = { findOne: jest.fn() };

  const completeCompanySettings = {
    id: 'company-settings',
    name: 'Acme Construction Ltd.',
    description: null,
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
    subcontractorId: 'sub-1',
    clientId: 'client-1',
    month: '2026-03-01T00:00:00.000Z',
    approvedFor: 'Shell + finishing work',
  };

  const mockReport = {
    id: 'report-1',
    project: {
      id: 'project-1',
      name: 'Shell',
      client: { id: 'client-1', name: 'Bar Yam Ltd.' },
    },
    subcontractor: { id: 'sub-1', name: 'Israelov Engineering' },
    date: '2026-03-01T00:00:00.000Z',
    profitMargin: 5,
    totalIncome: 867996,
    incomeEntries: [],
    corporationPayments: [
      {
        id: 'cp-1',
        amount: 219768.5,
        vatPercentage: 18,
        vatAmount: 39558.33,
        effectiveTotal: 259326.83,
        corporation: { id: 'corp-1', name: 'Sheq Sin Corp' },
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
      ],
    }).compile();

    service = module.get<PdfExportService>(PdfExportService);
    jest.clearAllMocks();

    mockCompanySettingsService.findOne.mockResolvedValue(
      completeCompanySettings,
    );
    mockVatRatesService.resolveForMonth.mockResolvedValue(18);
    mockProjectReportsService.findForSubcontractorAndClientInMonth.mockResolvedValue(
      [mockReport],
    );
    mockSubcontractorsService.findOne.mockResolvedValue({
      id: 'sub-1',
      name: 'Israelov Engineering',
      companyNumber: '516469053',
    });
  });

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

  it('should throw NoReportsForExportError when no reports match', async () => {
    mockProjectReportsService.findForSubcontractorAndClientInMonth.mockResolvedValue(
      [],
    );

    await expect(service.exportProjectReportsPdf(dto)).rejects.toThrow(
      NoReportsForExportError,
    );
  });

  it('should query reports scoped to the given subcontractor, client, and month', async () => {
    await service.exportProjectReportsPdf(dto);

    expect(
      mockProjectReportsService.findForSubcontractorAndClientInMonth,
    ).toHaveBeenCalledWith('sub-1', 'client-1', dto.month);
  });

  it('should render a non-empty PDF buffer when everything resolves', async () => {
    const result = await service.exportProjectReportsPdf(dto);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should compute the monthly figures matching the reference document math', async () => {
    // Reproduces the numbers verified against bill.pdf for a single report:
    // profit = income * margin/100; afterProfit = income - profit;
    // paymentExclVat = afterProfit - corpTotal; paymentInclVat = paymentExclVat * 1.18
    const puppeteer = jest.requireMock<{
      launch: jest.Mock;
    }>('puppeteer');
    const mockPage = {
      setContent: jest.fn<void, [string, unknown]>(),
      pdf: jest.fn().mockResolvedValue(Uint8Array.from([1])),
    };
    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };
    puppeteer.launch.mockResolvedValue(mockBrowser);

    await service.exportProjectReportsPdf(dto);

    const html = mockPage.setContent.mock.calls[0][0];
    // profit = 867996 * 0.05 = 43399.8; afterProfit = 824596.2
    // corpTotal = 219768.5; paymentExclVat = 604827.7; paymentInclVat ≈ 713696.69
    expect(html).toContain('43,399.80');
    expect(html).toContain('824,596.20');
    expect(html).toContain('219,768.50');
  });
});
