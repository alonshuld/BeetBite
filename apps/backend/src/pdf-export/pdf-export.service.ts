import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { ProjectReportsService } from 'src/project-reports/project-reports.service';
import { SubcontractorTeamsService } from 'src/subcontractors/subcontractor-teams.service';
import { ProjectsService } from 'src/projects/projects.service';
import { ExportProjectReportsPdfDto } from './dto/export-project-reports-pdf.dto';
import { ExportClientSimulatedPdfDto } from './dto/export-client-simulated-pdf.dto';
import { CompanySettingsIncompleteError } from './errors/company-settings-incomplete.error';
import { VatRateNotConfiguredError } from './errors/vat-rate-not-configured.error';
import { NoReportsForExportError } from './errors/no-reports-for-export.error';
import { InitiatorIncomeRequiredError } from './errors/initiator-income-required.error';
import { ProjectNotInClientExportError } from './errors/project-not-in-client-export.error';
import { InitiatorIncomeTooLowError } from '../project-reports/errors/initiator-income-too-low.error';
import {
  renderReportApprovalHtml,
  ReportApprovalData,
  ReportApprovalRow,
  ReportApprovalSupplierRow,
} from './templates/report-approval.template';
import {
  ClientSimulatedProjectCard,
  renderClientSimulatedExportHtml,
} from './templates/client-simulated-export.template';
import { PdfColors } from './templates/shared';
import { DEFAULT_PDF_FONT, isPdfFont, PdfFont } from 'src/common/pdf-fonts';
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
  pdfPrimaryColor: string;
  pdfSecondaryColor: string;
  pdfFont: string;
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
    private readonly subcontractorTeamsService: SubcontractorTeamsService,
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

    this.assertInitiatorIncomeSet(report);

    // A report is unique per project and month, so its own date is the month
    // the document covers — the caller does not supply one.
    const month = report.date;
    const vatPercentage = await this.vatRatesService.resolveForMonth(month);
    if (vatPercentage === null) {
      throw new VatRateNotConfiguredError(month);
    }

    // A team project names every member of the team, not just the one who
    // took it this month; a subcontractor working alone is a team of one.
    const subcontractors = await this.subcontractorTeamsService.findTeamOf(
      report.subcontractor.id,
    );

    const approvedFor = dto.approvedFor?.trim() ?? '';

    const data = this.buildReportApprovalData({
      report,
      effectiveMargin: report.profitMargin,
      vatPercentage,
      subcontractors,
      companySettings,
      approvedFor,
      // Typed in the export dialog for this document only. The project's own
      // description is edited from the projects screen and is not touched
      // here; an empty field simply prints no description row.
      projectDescription: dto.description?.trim() || null,
      lang: dto.lang ?? 'he',
    });

    this.logger.log(
      `Rendering account-approval PDF for project report ${dto.projectReportId}`,
    );
    const pdf = await this.renderPdf(renderReportApprovalHtml(data));

    // Only a *successful* render counts as an export — persisting before this
    // point would remember text from a request that never actually produced
    // a document. An empty field is not remembered: it would wipe the text
    // the dialog prefills next time.
    if (approvedFor) {
      await this.projectsService.updateLastApprovedFor(
        report.project.id,
        approvedFor,
      );
    }

    return { pdf, month };
  }

  /**
   * Every report of a client for one month, laid out as the Reports screen's
   * project sheets and rendered at the simulator's margins. Those margins are
   * transient: applied here at render time only, never written to any
   * ProjectReport — and the document never mentions that they differ.
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
        throw new ProjectNotInClientExportError(override.projectId);
      }
      overridesByProject.set(override.projectId, override.margin);
    }

    const month = clientReports[0].date;
    const lang = dto.lang ?? 'he';
    const teams = await this.subcontractorTeamsService.findTeamsOf(
      clientReports.map((report) => report.subcontractor.id),
    );
    // One card per project, as the Reports screen draws its sheets — at the
    // margin in force, with nothing of the stored one it may have replaced.
    const cards: ClientSimulatedProjectCard[] = clientReports.map((report) => {
      this.assertInitiatorIncomeSet(report);

      const margin =
        overridesByProject.get(report.project.id) ?? report.profitMargin;
      const profit = report.totalIncome * (margin / 100);
      const supplierTotal = report.supplierPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );
      return {
        projectName: report.project.name,
        projectLocation: report.project.location || null,
        projectDescription: report.project.description || null,
        incomeEntries: report.incomeEntries.map((entry) => ({
          tag: entry.tag,
          incomeDate: entry.incomeDate,
          amount: entry.amount,
        })),
        totalIncome: report.totalIncome,
        margin,
        profit,
        suppliers: report.supplierPayments.map((payment) => ({
          name: payment.supplier.name,
          amount: payment.amount,
        })),
        // Every member of a team project, the same on every card it worked.
        subcontractorName:
          teams
            .get(report.subcontractor.id)
            ?.map((member) => member.name)
            .join(' + ') ?? report.subcontractor.name,
        subcontractorPayment: report.totalIncome - profit - supplierTotal,
        initiator: report.project.initiatorName
          ? {
              name: report.project.initiatorName,
              income: report.initiatorIncome,
            }
          : null,
      };
    });

    const html = renderClientSimulatedExportHtml({
      lang,
      contractorName: companySettings.name,
      contractorCompanyNumber: companySettings.companyNumber,
      contractorDescription: companySettings.description,
      clientName: clientReports[0].project.client.name,
      month,
      cards,
      companyPhone: companySettings.phone,
      companyEmail: companySettings.email,
      companyAddress: this.formatCompanyAddress(companySettings),
      logo: companySettings.logo,
      colors: this.pdfColors(companySettings),
      font: this.pdfFont(companySettings),
    });

    this.logger.log(
      `Rendering client-simulated PDF for client ${dto.clientId}, month ${month}`,
    );
    const pdf = await this.renderPdf(html);

    // Simulated margins are never persisted — nothing to write back here,
    // unlike the single-report export's approvedFor memory.
    return { pdf, month };
  }

  /**
   * `initiatorIncome` only matters once a project has an initiator — a report
   * on a project with no initiator is exportable with it left unset. Once
   * there is an initiator, the export refuses to run without it: the value
   * only ever exists for this document.
   */
  private assertInitiatorIncomeSet(report: ProjectReportListItemDto): void {
    if (!report.project.initiatorName) return;
    if (report.initiatorIncome == null) {
      throw new InitiatorIncomeRequiredError();
    }
    // Backstop: income can grow after the initiator income was saved.
    if (report.initiatorIncome <= report.totalIncome) {
      throw new InitiatorIncomeTooLowError();
    }
  }

  private async getCompleteCompanySettings(): Promise<CompanySettingsForPdf> {
    const companySettings = await this.companySettingsService.findOne();
    if (!companySettings?.name || !companySettings?.companyNumber) {
      throw new CompanySettingsIncompleteError();
    }
    return companySettings as CompanySettingsForPdf;
  }

  private pdfColors(companySettings: CompanySettingsForPdf): PdfColors {
    return {
      primary: companySettings.pdfPrimaryColor,
      secondary: companySettings.pdfSecondaryColor,
    };
  }

  // The column is a plain string validated on write; a value that is no longer
  // on the list (a font since removed) falls back rather than failing export.
  private pdfFont(companySettings: CompanySettingsForPdf): PdfFont {
    return isPdfFont(companySettings.pdfFont)
      ? companySettings.pdfFont
      : DEFAULT_PDF_FONT;
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

  /** Builds the account-approval page data for the single-report export. */
  private buildReportApprovalData(args: {
    report: ProjectReportListItemDto;
    effectiveMargin: number;
    vatPercentage: number;
    subcontractors: { name: string; companyNumber: string }[];
    companySettings: CompanySettingsForPdf;
    approvedFor: string;
    projectDescription: string | null;
    lang: 'en' | 'he';
  }): ReportApprovalData {
    const {
      report,
      effectiveMargin,
      vatPercentage,
      subcontractors,
      companySettings,
      approvedFor,
      projectDescription,
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
    // a zero row.
    const initiator = report.project.initiatorName
      ? { name: report.project.initiatorName, income: report.initiatorIncome }
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
      subcontractors: subcontractors.map((member) => ({
        name: member.name,
        companyNumber: member.companyNumber,
      })),
      projectName: report.project.name,
      projectDescription,
      projectLocation: report.project.location || null,
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
      colors: this.pdfColors(companySettings),
      font: this.pdfFont(companySettings),
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
