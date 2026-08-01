import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { ProjectReportsService } from 'src/project-reports/project-reports.service';
import { SubcontractorsService } from 'src/subcontractors/subcontractors.service';
import { ExportProjectReportsPdfDto } from './dto/export-project-reports-pdf.dto';
import { CompanySettingsIncompleteError } from './errors/company-settings-incomplete.error';
import { VatRateNotConfiguredError } from './errors/vat-rate-not-configured.error';
import { NoReportsForExportError } from './errors/no-reports-for-export.error';
import {
  renderReportApprovalHtml,
  ReportApprovalRow,
  ReportApprovalSupplierRow,
} from './templates/report-approval.template';

/**
 * Service that renders a monthly account-approval PDF for one subcontractor's
 * project reports under one client, using headless Chromium via Puppeteer.
 */
@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly vatRatesService: VatRatesService,
    private readonly projectReportsService: ProjectReportsService,
    private readonly subcontractorsService: SubcontractorsService,
  ) {}

  async exportProjectReportsPdf(
    dto: ExportProjectReportsPdfDto,
  ): Promise<Buffer> {
    const companySettings = await this.companySettingsService.findOne();
    if (!companySettings?.name || !companySettings?.companyNumber) {
      throw new CompanySettingsIncompleteError();
    }

    const vatPercentage = await this.vatRatesService.resolveForMonth(dto.month);
    if (vatPercentage === null) {
      throw new VatRateNotConfiguredError(dto.month);
    }

    const reports =
      await this.projectReportsService.findForSubcontractorAndClientInMonth(
        dto.subcontractorId,
        dto.clientId,
        dto.month,
      );
    if (reports.length === 0) {
      throw new NoReportsForExportError(
        dto.subcontractorId,
        dto.clientId,
        dto.month,
      );
    }

    const subcontractor = await this.subcontractorsService.findOne(
      dto.subcontractorId,
    );

    const rows: ReportApprovalRow[] = reports.map((report) => {
      const profitAmount = report.totalIncome * (report.profitMargin / 100);
      const afterProfitAmount = report.totalIncome - profitAmount;
      return {
        projectName: report.project.name,
        approvedAmount: report.totalIncome,
        invoiceInclVat: report.totalIncome * (1 + vatPercentage / 100),
        profitMarginPercent: report.profitMargin,
        profitAmount,
        afterProfitAmount,
      };
    });

    const supplierRows: ReportApprovalSupplierRow[] = reports.flatMap(
      (report) =>
        report.corporationPayments.map((payment) => ({
          corporationName: payment.corporation.name,
          amount: payment.amount,
        })),
    );

    const supplierTotal = supplierRows.reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    const totalIncome = rows.reduce((sum, row) => sum + row.approvedAmount, 0);
    const totalAfterProfit = rows.reduce(
      (sum, row) => sum + row.afterProfitAmount,
      0,
    );
    const paymentExclVat = totalAfterProfit - supplierTotal;
    const paymentInclVat = paymentExclVat * (1 + vatPercentage / 100);

    const companyAddress =
      [companySettings.addressStreet, companySettings.addressCity]
        .filter(Boolean)
        .join(', ') || null;

    const html = renderReportApprovalHtml({
      lang: dto.lang ?? 'he',
      contractorName: companySettings.name,
      contractorCompanyNumber: companySettings.companyNumber,
      clientName: reports[0].project.client.name,
      subcontractorName: subcontractor.name,
      subcontractorCompanyNumber: subcontractor.companyNumber,
      approvedFor: dto.approvedFor,
      month: dto.month,
      rows,
      supplierRows,
      supplierTotal,
      totalIncome,
      totalAfterProfit,
      paymentExclVat,
      paymentInclVat,
      vatPercentage,
      companyPhone: companySettings.phone,
      companyEmail: companySettings.email,
      companyAddress,
      logo: companySettings.logo,
      signature: companySettings.signature,
    });

    this.logger.log(
      `Rendering account-approval PDF for subcontractor ${dto.subcontractorId}, client ${dto.clientId}, month ${dto.month}`,
    );
    return this.renderPdf(html);
  }

  private async renderPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBytes = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdfBytes);
    } finally {
      await browser.close();
    }
  }
}
