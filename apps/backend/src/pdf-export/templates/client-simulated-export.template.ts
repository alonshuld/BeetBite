import {
  reportApprovalStyles,
  renderReportApprovalPage,
  ReportApprovalData,
} from './report-approval.template';
import {
  escapeHtml,
  formatCurrency,
  formatMonthLabel,
  formatSignedCurrency,
  localeFor,
  dirFor,
  PdfColors,
} from './shared';

export interface ClientSimulatedProjectRow {
  projectId: string;
  projectName: string;
  projectLocation: string;
  subcontractorName: string;
  totalIncome: number;
  /** Margin in force: the simulated one, or the stored one when not overridden. */
  simMargin: number;
  savedMargin: number;
  profit: number;
  /** Profit the stored margin would give — what the simulation replaced. */
  savedProfit: number;
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
   * document.
   */
  detailPages: ReportApprovalData[];
  companyPhone: string | null;
  companyEmail: string | null;
  companyAddress: string | null;
  logo: string | null;
  signature: string | null;
  colors: PdfColors;
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
    projectCount: 'מספר פרויקטים:',
    subcontractor: 'קבלן משנה:',
    saved: 'שמור:',
    simulated: 'מדומה',
    simulationSummary: 'סיכום סימולציה',
    simulatedProfit: 'רווח מדומה',
    savedProfit: 'רווח שמור',
    deltaVsSaved: 'הפרש מהשמור',
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
    projectCount: 'Projects:',
    subcontractor: 'Subcontractor:',
    saved: 'Saved:',
    simulated: 'Simulated',
    simulationSummary: 'Simulation Summary',
    simulatedProfit: 'Simulated Profit',
    savedProfit: 'Saved Profit',
    deltaVsSaved: 'Delta vs Saved',
    simulatedNotice:
      'This document uses simulated profit margins for preview purposes only — no stored figures were changed.',
  },
} as const;

const renderSummaryPage = (data: ClientSimulatedExportData): string => {
  const t = LABELS[data.lang];
  const locale = localeFor(data.lang);
  const money = (amount: number): string => formatCurrency(amount, locale);
  const monthLabel = formatMonthLabel(data.month, data.lang);

  // A second, muted line under a figure that the simulation moved — the
  // stored value it replaced, as the project sheet shows it.
  const savedLine = (isSimulated: boolean, saved: string): string =>
    isSimulated ? `<span class="cell-sub">${t.saved} ${saved}</span>` : '';

  const rowsHtml = data.summaryRows
    .map((row) => {
      const isSimulated = row.simMargin !== row.savedMargin;
      return `
        <tr>
          <td>
            ${escapeHtml(row.projectName)}${isSimulated ? `<span class="sim-badge">${t.simulated}</span>` : ''}
            ${row.projectLocation ? `<span class="cell-sub">${escapeHtml(row.projectLocation)}</span>` : ''}
            <span class="cell-sub">${t.subcontractor} ${escapeHtml(row.subcontractorName)}</span>
          </td>
          <td class="amount">${money(row.totalIncome)}</td>
          <td class="amount muted">${row.simMargin}%${savedLine(isSimulated, `${row.savedMargin}%`)}</td>
          <td class="amount">${money(row.profit)}${savedLine(isSimulated, money(row.savedProfit))}</td>
          <td class="amount">${money(row.supplierTotal)}</td>
          <td class="amount strong">${money(row.subcontractorPayment)}</td>
        </tr>`;
    })
    .join('');

  const totals = data.summaryRows.reduce(
    (acc, row) => ({
      totalIncome: acc.totalIncome + row.totalIncome,
      profit: acc.profit + row.profit,
      savedProfit: acc.savedProfit + row.savedProfit,
      supplierTotal: acc.supplierTotal + row.supplierTotal,
      subcontractorPayment: acc.subcontractorPayment + row.subcontractorPayment,
    }),
    {
      totalIncome: 0,
      profit: 0,
      savedProfit: 0,
      supplierTotal: 0,
      subcontractorPayment: 0,
    },
  );
  const anySimulated = data.summaryRows.some(
    (row) => row.simMargin !== row.savedMargin,
  );
  const profitDelta = totals.profit - totals.savedProfit;

  // The simulator drawer's own totals: what the margins now add up to, and —
  // only once something was actually moved — how far that is from the stored
  // figures.
  const deltaRowHtml = anySimulated
    ? `<div class="summary-row"><span>${t.savedProfit}</span><span>${money(totals.savedProfit)}</span></div>
        <div class="summary-row"><span>${t.deltaVsSaved}</span><span dir="ltr" class="${profitDelta >= 0 ? 'delta-up' : 'delta-down'}">${formatSignedCurrency(profitDelta, locale)}</span></div>`
    : '';

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
      <div class="info-row"><span class="label">${t.projectCount}</span><span>${data.summaryRows.length}</span></div>
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

    <div class="lower">
      <div class="summary-box">
        <div class="summary-title">${t.simulationSummary}</div>
        <div class="summary-row"><span>${t.simulatedProfit}</span><span>${money(totals.profit)}</span></div>
        ${deltaRowHtml}
      </div>
      <p class="notice">${t.simulatedNotice}</p>
    </div>
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
${reportApprovalStyles(dir, data.colors)}
/* Each project's page (summary included) must start on its own printed page
   — without this, puppeteer would run them together as one continuous flow. */
.page { break-after: page; }
.page:last-child { break-after: auto; }
/* A muted second line inside a summary cell — location, subcontractor, or the
   stored figure a simulated one replaced. */
.cell-sub { display: block; font-size: 9px; font-weight: 400; color: #667; margin-top: 2px; }
.delta-up { color: #1e7a46; }
.delta-down { color: #b4531a; }
.notice { flex: 1; margin: 0; font-size: 10.5px; color: #667; }
</style>
</head>
<body>
${summaryPage}
${detailPages}
</body>
</html>`;
};
