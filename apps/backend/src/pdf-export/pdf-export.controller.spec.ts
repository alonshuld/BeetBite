import { Test, TestingModule } from '@nestjs/testing';
import { PdfExportController } from './pdf-export.controller';
import { PdfExportService } from './pdf-export.service';
import { ExportProjectReportsPdfDto } from './dto/export-project-reports-pdf.dto';
import { ExportClientSimulatedPdfDto } from './dto/export-client-simulated-pdf.dto';
import type { Response } from 'express';

// pdf-export.service.ts imports the real puppeteer package at module load
// time, regardless of the DI provider override below — stub it so this
// controller-only spec never loads a browser driver.
vi.mock('puppeteer', () => ({ default: { launch: vi.fn() } }));

describe('PdfExportController', () => {
  let controller: PdfExportController;

  const mockPdfExportService = {
    exportProjectReportsPdf: vi.fn(),
    exportClientSimulatedPdf: vi.fn(),
  };

  const dto: ExportProjectReportsPdfDto = {
    projectReportId: 'report-1',
    approvedFor: 'Shell + finishing work',
  };

  const mockResponse = () => {
    const setMock = vi.fn();
    const statusMock = vi.fn();
    const sendMock = vi.fn();
    const res = {
      set: setMock,
      status: statusMock,
      send: sendMock,
    } as unknown as Response;
    setMock.mockReturnValue(res);
    statusMock.mockReturnValue(res);
    sendMock.mockReturnValue(res);
    return { res, setMock, statusMock, sendMock };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfExportController],
      providers: [
        { provide: PdfExportService, useValue: mockPdfExportService },
      ],
    }).compile();

    controller = module.get<PdfExportController>(PdfExportController);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should stream the rendered PDF with the right headers', async () => {
    const pdf = Buffer.from([1, 2, 3]);
    // The month comes back from the service now — the request no longer names it.
    mockPdfExportService.exportProjectReportsPdf.mockResolvedValue({
      pdf,
      month: '2026-03-01T00:00:00.000Z',
    });
    const { res, setMock, statusMock, sendMock } = mockResponse();

    await controller.exportPdf(dto, res);

    expect(mockPdfExportService.exportProjectReportsPdf).toHaveBeenCalledWith(
      dto,
    );
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/pdf',
        'Content-Disposition': expect.stringContaining(
          'account-approval-2026-03',
        ) as string,
      }),
    );
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(sendMock).toHaveBeenCalledWith(pdf);
  });

  it('should propagate errors from the service without writing a response', async () => {
    mockPdfExportService.exportProjectReportsPdf.mockRejectedValue(
      new Error('Company settings incomplete'),
    );
    const { res, sendMock } = mockResponse();

    await expect(controller.exportPdf(dto, res)).rejects.toThrow(
      'Company settings incomplete',
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  describe('exportClientSimulatedPdf', () => {
    const simDto: ExportClientSimulatedPdfDto = {
      clientId: 'client-1',
      month: '2026-03-01',
      overrides: [{ projectId: 'project-1', margin: 15 }],
    };

    it('should stream the rendered PDF with the right headers', async () => {
      const pdf = Buffer.from([1, 2, 3]);
      mockPdfExportService.exportClientSimulatedPdf.mockResolvedValue({
        pdf,
        month: '2026-03-01T00:00:00.000Z',
      });
      const { res, setMock, statusMock, sendMock } = mockResponse();

      await controller.exportClientSimulatedPdf(simDto, res);

      expect(
        mockPdfExportService.exportClientSimulatedPdf,
      ).toHaveBeenCalledWith(simDto);
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': expect.stringContaining(
            'projects-report-2026-03',
          ) as string,
        }),
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(sendMock).toHaveBeenCalledWith(pdf);
    });

    it('should propagate errors from the service without writing a response', async () => {
      mockPdfExportService.exportClientSimulatedPdf.mockRejectedValue(
        new Error('No reports for this client'),
      );
      const { res, sendMock } = mockResponse();

      await expect(
        controller.exportClientSimulatedPdf(simDto, res),
      ).rejects.toThrow('No reports for this client');
      expect(sendMock).not.toHaveBeenCalled();
    });
  });
});
