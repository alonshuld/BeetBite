import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { ProjectReportsService } from 'src/project-reports/project-reports.service';
import { SubcontractorsService } from 'src/subcontractors/subcontractors.service';
import { ProjectsService } from 'src/projects/projects.service';
import { ExportProjectReportsPdfDto } from './dto/export-project-reports-pdf.dto';
import { ExportClientSimulatedPdfDto } from './dto/export-client-simulated-pdf.dto';
import { CompanySettingsIncompleteError } from './errors/company-settings-incomplete.error';
import { VatRateNotConfiguredError } from './errors/vat-rate-not-configured.error';
import { NoReportsForExportError } from './errors/no-reports-for-export.error';
import {
  renderReportApprovalHtml,
  ReportApprovalData,
  ReportApprovalRow,
  ReportApprovalSupplierRow,
  ReportApprovalInitiatorRow,
} from './templates/report-approval.template';
import { renderClientSimulatedExportHtml } from './templates/client-simulated-export.template';
import { ProjectReportListItemDto } from 'src/project-reports/dto/project-report-list-item.dto';
import { normalizeToMonthStart } from 'src/common/utils/date.utils';

interface CompanySettingsForPdf {
  name: string;
  companyNumber: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  logo: string | null;
  signature: string | null;
}

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
    private readonly projectsService: ProjectsService,
  ) {}

  async exportProjectReportsPdf(
    dto: ExportProjectReportsPdfDto,
  ): Promise<{ pdf: Buffer; month: string }> {
    const companySettings = await this.getCompleteCompanySettings();

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

    const data = this.buildReportApprovalData({
      report,
      effectiveMargin: report.profitMargin,
      vatPercentage,
      subcontractor,
      companySettings,
      approvedFor: dto.approvedFor,
      lang: dto.lang ?? 'he',
    });

    this.logger.log(
      `Rendering account-approval PDF for project report ${dto.projectReportId}`,
    );
    const pdf = await this.renderPdf(renderReportApprovalHtml(data));

    // Only a *successful* render counts as an export — persisting before this
    // point would remember text from a request that never actually produced
    // a document.
    await this.projectsService.updateLastApprovedFor(
      report.project.id,
      dto.approvedFor,
    );

    return { pdf, month };
  }

  /**
   * A summary page followed by one account-approval-style page per project —
   * every report of a client for one month, rendered at simulated margins.
   * Simulated margins are transient: applied here at render time only, never
   * written to any ProjectReport.
   */
  async exportClientSimulatedPdf(
    dto: ExportClientSimulatedPdfDto,
  ): Promise<{ pdf: Buffer; month: string }> {
    const companySettings = await this.getCompleteCompanySettings();

    // findProjectReportsInMonth is normally reached through a DTO whose
    // @Transform widens a date-only string into a full ISO datetime — Prisma
    // rejects the bare form ("premature end of input"). Calling the service
    // directly bypasses that pipeline, so the widening has to happen here.
    const normalizedMonth = normalizeToMonthStart(dto.month);
    const allReports =
      await this.projectReportsService.findProjectReportsInMonth({
        month: normalizedMonth,
      });
    // "All of a client's reports for the month" means the *resolved* client —
    // findProjectReportsInMonth already resolves report.project.client
    // per report's own month, so a transferred-away project never lands under
    // the wrong client's simulated export.
    const clientReports = allReports.filter(
      (r) => r.project.client.id === dto.clientId,
    );
    if (clientReports.length === 0) {
      throw new NoReportsForExportError(dto.clientId);
    }

    const clientProjectIds = new Set(clientReports.map((r) => r.project.id));
    const overridesByProject = new Map<string, number>();
    for (const override of dto.overrides) {
      if (!clientProjectIds.has(override.projectId)) {
        throw new BadRequestException(
          `Project ${override.projectId} is not one of this client's projects for the given month`,
        );
      }
      overridesByProject.set(override.projectId, override.margin);
    }

    const month = clientReports[0].date;
    const vatPercentage = await this.vatRatesService.resolveForMonth(month);
    if (vatPercentage === null) {
      throw new VatRateNotConfiguredError(month);
    }

    const lang = dto.lang ?? 'he';
    const detailPages: ReportApprovalData[] = [];
    const summaryRows = [];
    for (const report of clientReports) {
      const subcontractor = await this.subcontractorsService.findOne(
        report.subcontractor.id,
      );
      const effectiveMargin =
        overridesByProject.get(report.project.id) ?? report.profitMargin;

      const data = this.buildReportApprovalData({
        report,
        effectiveMargin,
        vatPercentage,
        subcontractor,
        companySettings,
        // This is a new, distinct document from the manual per-report
        // export — it does not carry that flow's remembered "approved for"
        // text, by design.
        approvedFor: '',
        lang,
      });
      detailPages.push(data);

      const profit = report.totalIncome * (effectiveMargin / 100);
      const supplierTotal = report.supplierPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );
      summaryRows.push({
        projectId: report.project.id,
        projectName: report.project.name,
        totalIncome: report.totalIncome,
        simMargin: effectiveMargin,
        profit,
        supplierTotal,
        subcontractorPayment: report.totalIncome - profit - supplierTotal,
      });
    }

    const html = renderClientSimulatedExportHtml({
      lang,
      contractorName: companySettings.name,
      contractorCompanyNumber: companySettings.companyNumber,
      contractorDescription: companySettings.description,
      clientName: clientReports[0].project.client.name,
      month,
      summaryRows,
      detailPages,
      companyPhone: companySettings.phone,
      companyEmail: companySettings.email,
      companyAddress: this.formatCompanyAddress(companySettings),
      logo: companySettings.logo,
      signature: companySettings.signature,
    });

    this.logger.log(
      `Rendering client-simulated PDF for client ${dto.clientId}, month ${month}`,
    );
    const pdf = await this.renderPdf(html);

    // Simulated margins are never persisted — nothing to write back here,
    // unlike the single-report export's approvedFor memory.
    return { pdf, month };
  }

  private async getCompleteCompanySettings(): Promise<CompanySettingsForPdf> {
    const companySettings = await this.companySettingsService.findOne();
    if (!companySettings?.name || !companySettings?.companyNumber) {
      throw new CompanySettingsIncompleteError();
    }
    return companySettings as CompanySettingsForPdf;
  }

  private formatCompanyAddress(
    companySettings: CompanySettingsForPdf,
  ): string | null {
    return (
      [companySettings.addressStreet, companySettings.addressCity]
        .filter(Boolean)
        .join(', ') || null
    );
  }

  /**
   * Builds the shared per-report page data used by both the single-report
   * export and each detail page of the client-simulated export. `effectiveMargin`
   * is the only thing that differs between the two callers — the real stored
   * margin for a normal export, a simulated one for the client-wide export —
   * everything else (income entries, supplier/initiator payments) always
   * reflects real data.
   */
  private buildReportApprovalData(args: {
    report: ProjectReportListItemDto;
    effectiveMargin: number;
    vatPercentage: number;
    subcontractor: { name: string; companyNumber: string };
    companySettings: CompanySettingsForPdf;
    approvedFor: string;
    lang: 'en' | 'he';
  }): ReportApprovalData {
    const {
      report,
      effectiveMargin,
      vatPercentage,
      subcontractor,
      companySettings,
      approvedFor,
      lang,
    } = args;

    // One row per income entry: each is a chunk of approved work carrying its
    // own label, which is what the approval itemises.
    const rows: ReportApprovalRow[] = report.incomeEntries.map((entry) => {
      const profitAmount = entry.amount * (effectiveMargin / 100);
      return {
        tag: entry.tag,
        approvedAmount: entry.amount,
        invoiceInclVat: entry.amount * (1 + vatPercentage / 100),
        profitMarginPercent: effectiveMargin,
        profitAmount,
        afterProfitAmount: entry.amount - profitAmount,
      };
    });

    const supplierRows: ReportApprovalSupplierRow[] =
      report.supplierPayments.map((payment) => ({
        supplierName: payment.supplier.name,
        amount: payment.amount,
      }));

    // No initiator on the project → absent entirely, not an empty heading or
    // a zero row. Initiator with no payments this month → name still prints,
    // only the rows are conditional on there being payments.
    const initiatorRows: ReportApprovalInitiatorRow[] =
      report.initiatorPayments.map((payment) => ({
        description: payment.description ?? '',
        amount: payment.amount,
      }));
    const initiator = report.project.initiatorName
      ? { name: report.project.initiatorName, rows: initiatorRows }
      : null;

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

    return {
      lang,
      contractorName: companySettings.name,
      contractorCompanyNumber: companySettings.companyNumber,
      contractorDescription: companySettings.description,
      requesterName: report.project.requesterName,
      subcontractorName: subcontractor.name,
      subcontractorCompanyNumber: subcontractor.companyNumber,
      projectName: report.project.name,
      approvedFor,
      month: report.date,
      rows,
      supplierRows,
      supplierTotal,
      initiator,
      totalIncome,
      totalAfterProfit,
      paymentExclVat,
      paymentInclVat,
      vatPercentage,
      companyPhone: companySettings.phone,
      companyEmail: companySettings.email,
      companyAddress: this.formatCompanyAddress(companySettings),
      logo: companySettings.logo,
      signature: companySettings.signature,
    };
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
