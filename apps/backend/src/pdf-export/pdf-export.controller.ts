import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { PdfExportService } from './pdf-export.service';
import { ExportProjectReportsPdfDto } from './dto/export-project-reports-pdf.dto';
import { ExportClientSimulatedPdfDto } from './dto/export-client-simulated-pdf.dto';

/**
 * Controller for exporting monthly account-approval PDFs from project reports.
 * @param pdfExportService Service providing PDF-export business logic
 */
@ApiBearerAuth()
@ApiTags('projects/reports')
@Controller()
export class PdfExportController {
  constructor(private readonly pdfExportService: PdfExportService) {}

  /**
   * Renders the monthly account-approval PDF for one project report.
   * @param dto Export parameters (project report, approved-for text, language)
   * @param res Raw Express response — this endpoint streams a PDF binary, not JSON
   */
  @Post('/projects/reports/export-pdf')
  @ApiOperation({
    summary: 'Export the monthly account-approval PDF for one project report',
  })
  @ApiProduces('application/pdf')
  @ApiBadRequestResponse({
    description:
      'Company settings incomplete, or no VAT rate configured for the month',
  })
  @ApiNotFoundResponse({
    description: 'No project report found with the given id',
  })
  async exportPdf(
    @Body() dto: ExportProjectReportsPdfDto,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, month } =
      await this.pdfExportService.exportProjectReportsPdf(dto);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="account-approval-${month.slice(0, 7)}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.status(HttpStatus.OK).send(pdf);
  }

  /**
   * Renders the client-wide simulated PDF — all of a client's reports for one
   * month as the Reports screen's project sheets, at simulated (never
   * persisted) profit margins.
   * @param dto Export parameters (client, month, per-project margin overrides, language)
   * @param res Raw Express response — this endpoint streams a PDF binary, not JSON
   */
  @Post('/projects/reports/export-client-simulated-pdf')
  @ApiOperation({
    summary:
      'Export the client-wide simulated PDF — every report of a client for a month, at simulated margins',
  })
  @ApiProduces('application/pdf')
  @ApiBadRequestResponse({
    description:
      'Company settings incomplete, or an override references a project outside this client',
  })
  @ApiNotFoundResponse({
    description: 'No reports found for this client in the given month',
  })
  async exportClientSimulatedPdf(
    @Body() dto: ExportClientSimulatedPdfDto,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, month } =
      await this.pdfExportService.exportClientSimulatedPdf(dto);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="projects-report-${month.slice(0, 7)}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.status(HttpStatus.OK).send(pdf);
  }
}
