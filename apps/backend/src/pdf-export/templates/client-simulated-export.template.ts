import {
  reportApprovalStyles,
  renderReportApprovalPage,
  ReportApprovalData,
} from './report-approval.template';
import {
  escapeHtml,
  formatCurrency,
  formatMonthLabel,
  localeFor,
  dirFor,
} from './shared';

export interface ClientSimulatedProjectRow {
  projectId: string;
  projectName: string;
  totalIncome: number;
  simMargin: number;
  profit: number;
  supplierTotal: number;
  subcontractorPayment: number;
}

export interface ClientSimulatedExportData {
  lang: 'en' | 'he';
  contractorName: string;
  contractorCompanyNumber: string;
  contractorDescription: string | null;
  clientName: string;
  month: string;
  /** One row per project, for the summary page. */
  summaryRows: ClientSimulatedProjectRow[];
  /**
   * One full account-approval-style page per project, already computed at
   * the simulated margin. Rendered after the summary page, in the same
   * document — see T6.
   */
  detailPages: ReportApprovalData[];
  companyPhone: string | null;
  companyEmail: string | null;
  companyAddress: string | null;
  logo: string | null;
  signature: string | null;
}

const LABELS = {
  he: {
    subtitlePrefix: 'דוח רווח מדומה – חודש',
    client: 'לקוח:',
    mainContractor: 'קבלן ראשי:',
    project: 'פרויקט',
    income: 'הכנסה',
    simMargin: '% רווח מדומה',
    profit: 'רווח',
    supplierDeductions: 'קיזוזי ספקים',
    subcontractorPayment: 'יתרת קבלן משנה',
    total: 'סה"כ',
    companyNumberPrefix: 'ח.פ.',
    simulatedNotice:
      'המסמך מבוסס על אחוזי רווח מדומים, לצורכי הדמיה בלבד — הנתונים השמורים במערכת לא השתנו.',
  },
  en: {
    subtitlePrefix: 'Simulated Profit Report –',
    client: 'Client:',
    mainContractor: 'Main Contractor:',
    project: 'Project',
    income: 'Income',
    simMargin: 'Sim. Margin %',
    profit: 'Profit',
    supplierDeductions: 'Supplier Deductions',
    subcontractorPayment: 'Subcontractor Remainder',
    total: 'Total',
    companyNumberPrefix: 'Reg.',
    simulatedNotice:
      'This document uses simulated profit margins for preview purposes only — no stored figures were changed.',
  },
} as const;

const renderSummaryPage = (data: ClientSimulatedExportData): string => {
  const t = LABELS[data.lang];
  const locale = localeFor(data.lang);
  const money = (amount: number): string => formatCurrency(amount, locale);
  const monthLabel = formatMonthLabel(data.month, data.lang);

  const rowsHtml = data.summaryRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.projectName)}</td>
          <td class="amount">${money(row.totalIncome)}</td>
          <td class="amount muted">${row.simMargin}%</td>
          <td class="amount">${money(row.profit)}</td>
          <td class="amount">${money(row.supplierTotal)}</td>
          <td class="amount strong">${money(row.subcontractorPayment)}</td>
        </tr>`,
    )
    .join('');

  const totals = data.summaryRows.reduce(
    (acc, row) => ({
      totalIncome: acc.totalIncome + row.totalIncome,
      profit: acc.profit + row.profit,
      supplierTotal: acc.supplierTotal + row.supplierTotal,
      subcontractorPayment: acc.subcontractorPayment + row.subcontractorPayment,
    }),
    { totalIncome: 0, profit: 0, supplierTotal: 0, subcontractorPayment: 0 },
  );

  return `<div class="page">
  <div class="header">
    <div class="identity">
      <div class="contractor-name">${escapeHtml(data.contractorName)}</div>
      ${data.contractorDescription ? `<div class="contractor-desc">${escapeHtml(data.contractorDescription)}</div>` : ''}
      <div class="company-number">${t.companyNumberPrefix} ${escapeHtml(data.contractorCompanyNumber)}</div>
    </div>
    ${data.logo ? `<img class="logo" src="${data.logo}" />` : ''}
  </div>

  <div class="content">
    <div class="title"><span>${t.subtitlePrefix} ${monthLabel}</span></div>

    <div class="info-box">
      <div class="info-row"><span class="label">${t.client}</span><span>${escapeHtml(data.clientName)}</span></div>
      <div class="info-row"><span class="label">${t.mainContractor}</span><span>${escapeHtml(data.contractorName)} • ${t.companyNumberPrefix} ${escapeHtml(data.contractorCompanyNumber)}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${t.project}</th>
          <th>${t.income}</th>
          <th>${t.simMargin}</th>
          <th>${t.profit}</th>
          <th>${t.supplierDeductions}</th>
          <th>${t.subcontractorPayment}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td>${t.total}</td>
          <td class="amount">${money(totals.totalIncome)}</td>
          <td></td>
          <td class="amount">${money(totals.profit)}</td>
          <td class="amount">${money(totals.supplierTotal)}</td>
          <td class="amount">${money(totals.subcontractorPayment)}</td>
        </tr>
      </tfoot>
    </table>

    <p style="font-size: 10.5px; color: #667; margin-top: -8px;">${t.simulatedNotice}</p>
  </div>

  <div class="footer">
    <div>${[data.companyAddress, data.companyPhone]
      .filter((value): value is string => Boolean(value))
      .map(escapeHtml)
      .join(' • ')}</div>
    <div>${data.companyEmail ? escapeHtml(data.companyEmail) : ''}</div>
  </div>
</div>`;
};

export const renderClientSimulatedExportHtml = (
  data: ClientSimulatedExportData,
): string => {
  const dir = dirFor(data.lang);
  const summaryPage = renderSummaryPage(data);
  const detailPages = data.detailPages.map(renderReportApprovalPage).join('');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${data.lang}">
<head>
<meta charset="UTF-8" />
<style>
${reportApprovalStyles(dir)}
/* Each project's page (summary included) must start on its own printed page
   — without this, puppeteer would run them together as one continuous flow. */
.page { break-after: page; }
.page:last-child { break-after: auto; }
</style>
</head>
<body>
${summaryPage}
${detailPages}
</body>
</html>`;
};
