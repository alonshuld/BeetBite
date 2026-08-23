import { Test, TestingModule } from '@nestjs/testing';
import { PdfExportController } from './pdf-export.controller';
import { PdfExportService } from './pdf-export.service';
import { ExportProjectReportsPdfDto } from './dto/export-project-reports-pdf.dto';
import { Response } from 'express';

// pdf-export.service.ts imports the real (ESM-only) puppeteer package at
// module load time, regardless of the DI provider override below — stub it
// so this controller-only spec doesn't need Jest to parse puppeteer's ESM.
jest.mock('puppeteer', () => ({ launch: jest.fn() }));

describe('PdfExportController', () => {
  let controller: PdfExportController;

  const mockPdfExportService = {
    exportProjectReportsPdf: jest.fn(),
  };

  const dto: ExportProjectReportsPdfDto = {
    projectReportId: 'report-1',
    approvedFor: 'Shell + finishing work',
  };

  const mockResponse = () => {
    const setMock = jest.fn();
    const statusMock = jest.fn();
    const sendMock = jest.fn();
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
    jest.clearAllMocks();
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
});
