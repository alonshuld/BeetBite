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
 * Service that renders the monthly account-approval PDF for a single project
 * report, using headless Chromium via Puppeteer.
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
  ): Promise<{ pdf: Buffer; month: string }> {
    const companySettings = await this.companySettingsService.findOne();
    if (!companySettings?.name || !companySettings?.companyNumber) {
      throw new CompanySettingsIncompleteError();
    }

    let report;
    try {
      report = await this.projectReportsService.findOneForExport(
        dto.projectReportId,
      );
    } catch {
      throw new NoReportsForExportError(dto.projectReportId);
    }

    // A report is unique per project and month, so its own date is the month
    // the document covers — the caller does not supply one.
    const month = report.date;
    const vatPercentage = await this.vatRatesService.resolveForMonth(month);
    if (vatPercentage === null) {
      throw new VatRateNotConfiguredError(month);
    }

    const subcontractor = await this.subcontractorsService.findOne(
      report.subcontractor.id,
    );

    // One row per income entry: each is a chunk of approved work carrying its
    // own label, which is what the approval itemises.
    const rows: ReportApprovalRow[] = report.incomeEntries.map((entry) => {
      const profitAmount = entry.amount * (report.profitMargin / 100);
      return {
        tag: entry.tag,
        approvedAmount: entry.amount,
        invoiceInclVat: entry.amount * (1 + vatPercentage / 100),
        profitMarginPercent: report.profitMargin,
        profitAmount,
        afterProfitAmount: entry.amount - profitAmount,
      };
    });

    const supplierRows: ReportApprovalSupplierRow[] =
      report.corporationPayments.map((payment) => ({
        corporationName: payment.corporation.name,
        amount: payment.amount,
      }));

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
      contractorDescription: companySettings.description,
      clientName: report.project.client.name,
      subcontractorName: subcontractor.name,
      subcontractorCompanyNumber: subcontractor.companyNumber,
      projectName: report.project.name,
      approvedFor: dto.approvedFor,
      month,
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
      `Rendering account-approval PDF for project report ${dto.projectReportId}`,
    );
    return { pdf: await this.renderPdf(html), month };
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
