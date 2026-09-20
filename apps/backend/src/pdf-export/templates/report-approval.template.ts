import { OPENING_BALANCE_TAG } from 'src/common/constants';

export interface ReportApprovalRow {
  tag: string | null;
  /**
   * When the income arrived, null while it is still pending. Only read when
   * the page carries `screen` details; the plain approval has no status column.
   */
  incomeDate?: string | null;
  approvedAmount: number;
  invoiceInclVat: number;
  profitMarginPercent: number;
  profitAmount: number;
  afterProfitAmount: number;
}

export interface ReportApprovalSupplierRow {
  supplierName: string;
  amount: number;
}

export interface ReportApprovalInitiatorRow {
  description: string;
  amount: number;
}

/**
 * What the Reports screen shows for a project on top of the approval figures.
 * Only the client-simulated export supplies it, so the single-report
 * document keeps its fixed layout.
 */
export interface ReportApprovalScreenDetails {
  projectLocation: string;
  projectDescription: string;
  /** Margin in force on this page — simulated, or stored when not overridden. */
  marginPercent: number;
  /**
   * The stored margin and the profit it would give, present only when the
   * simulation moved this project — the sheet's "saved margin" line.
   */
  saved: { marginPercent: number; profitAmount: number } | null;
}

export interface ReportApprovalData {
  lang: 'en' | 'he';
  contractorName: string;
  contractorCompanyNumber: string;
  contractorDescription: string | null;
  requesterName: string;
  subcontractorName: string;
  subcontractorCompanyNumber: string;
  projectName: string;
  approvedFor: string;
  month: string;
  rows: ReportApprovalRow[];
  supplierRows: ReportApprovalSupplierRow[];
  supplierTotal: number;
  /**
   * Absent (not empty) when the project has no initiator — the whole
   * initiator block is then omitted entirely, not rendered with a zero row.
   * Present with an empty `rows` array when there is an initiator but no
   * payments this month: the name still prints.
   */
  initiator: { name: string; rows: ReportApprovalInitiatorRow[] } | null;
  totalIncome: number;
  totalAfterProfit: number;
  paymentExclVat: number;
  paymentInclVat: number;
  vatPercentage: number;
  companyPhone: string | null;
  companyEmail: string | null;
  companyAddress: string | null;
  logo: string | null;
  signature: string | null;
  screen?: ReportApprovalScreenDetails;
}

const LABELS = {
  he: {
    subtitlePrefix: 'אישור חשבון – חודש',
    client: 'שם המזמין:',
    tag: 'תיאור',
    mainContractor: 'קבלן ראשי:',
    subcontractor: 'קבלן משנה:',
    approvedFor: 'חשבון מאושר עבור:',
    approvedAmount: 'חשבון שאושר',
    invoiceInclVat: 'חשבונית כולל מע"מ',
    profitMarginPercent: '% רווח קבלני',
    profitAmount: 'סה"כ רווח (לפני מע"מ)',
    afterProfit: 'סה"כ בקיזוז רווח (לפני מע"מ)',
    supplierName: 'שם הספק',
    supplierInvoice: 'חשבונית ספקים (ללא מע"מ)',
    supplierTotal: 'סה"כ קיזוזי ספקים',
    initiator: 'יזם:',
    initiatorPaymentDescription: 'תיאור',
    initiatorPaymentAmount: 'סכום',
    monthlySummary: 'סיכום חודשי',
    totalIncome: 'סה"כ הכנסות',
    totalAfterProfit: 'סה"כ הכנסות לאחר קיזוז רווח קבלני',
    totalDeductions: 'סה"כ קיזוזים',
    paymentExclVat: 'לתשלום לפני מע"מ',
    paymentInclVat: 'לתשלום כולל מע"מ',
    signature: 'חתימה וחותמת מאשר',
    companyNumberPrefix: 'ח.פ.',
    incomeStatus: 'סטטוס',
    received: 'התקבל',
    pending: 'ממתין',
    openingBalance: 'יתרת פתיחה',
    profit: 'רווח',
    location: 'מיקום:',
    projectDescription: 'תיאור הפרויקט:',
    savedMargin: '% רווח שמור:',
    simulated: 'מדומה',
  },
  en: {
    subtitlePrefix: 'Account Approval –',
    client: 'Client:',
    tag: 'Tag',
    mainContractor: 'Main Contractor:',
    subcontractor: 'Subcontractor:',
    approvedFor: 'Approved For:',
    approvedAmount: 'Approved Amount',
    invoiceInclVat: 'Invoice incl. VAT',
    profitMarginPercent: 'Profit Margin %',
    profitAmount: 'Total Profit (excl. VAT)',
    afterProfit: 'Total After Profit (excl. VAT)',
    supplierName: 'Supplier',
    supplierInvoice: 'Supplier Invoice (excl. VAT)',
    supplierTotal: 'Total Supplier Deductions',
    initiator: 'Initiator:',
    initiatorPaymentDescription: 'Description',
    initiatorPaymentAmount: 'Amount',
    monthlySummary: 'Monthly Summary',
    totalIncome: 'Total Income',
    totalAfterProfit: 'Total Income After Profit Cut',
    totalDeductions: 'Total Deductions',
    paymentExclVat: 'Payable Excl. VAT',
    paymentInclVat: 'Payable Incl. VAT',
    signature: 'Approving Signature & Stamp',
    companyNumberPrefix: 'Reg.',
    incomeStatus: 'Status',
    received: 'Received',
    pending: 'Pending',
    openingBalance: 'Opening balance',
    profit: 'Profit',
    location: 'Location:',
    projectDescription: 'Description:',
    savedMargin: 'Saved Margin %:',
    simulated: 'Simulated',
  },
} as const;

import {
  escapeHtml,
  formatCurrency,
  formatDate,
  formatMonthLabel,
  localeFor,
  dirFor,
} from './shared';

/**
 * The CSS shared by every account-approval-style page. Exported so the
 * client-wide simulated export can wrap several of these pages plus its
 * own summary page in one document without duplicating the stylesheet.
 */
export const reportApprovalStyles = (dir: 'rtl' | 'ltr'): string => `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans Hebrew", "Noto Sans", Arial, sans-serif;
    color: #1f2430;
    margin: 0;
    font-size: 12px;
  }
  .page { padding: 0 0 28px; }
  .content { padding: 0 34px; }

  /* Full-bleed header band */
  .header {
    background: #1f2a44;
    color: #fff;
    padding: 20px 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 4px solid #c9a24b;
  }
  .header .identity { text-align: ${dir === 'rtl' ? 'right' : 'left'}; }
  .header .contractor-name { font-size: 26px; font-weight: 700; line-height: 1.15; }
  .header .contractor-desc { font-size: 12px; color: #c9c9d4; margin-top: 3px; }
  .header .company-number { font-size: 11px; color: #9aa2b8; margin-top: 4px; }
  .header .logo { max-height: 62px; max-width: 150px; }

  .title {
    text-align: center;
    font-size: 21px;
    font-weight: 700;
    margin: 26px 0 22px;
  }
  .title span { border-bottom: 3px solid #c9a24b; padding-bottom: 6px; }

  /* Info box — gold rule on the leading edge */
  .info-box {
    background: #f7f8fa;
    border-${dir === 'rtl' ? 'right' : 'left'}: 4px solid #c9a24b;
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 22px;
  }
  .info-row { display: flex; gap: 10px; padding: 3px 0; font-size: 12px; }
  .info-row .label { color: #667; font-weight: 700; min-width: 118px; }
  .sim-badge {
    display: inline-block;
    background: #c9a24b;
    color: #1f2a44;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    border-radius: 3px;
    padding: 1px 6px;
    margin-inline-start: 6px;
  }

  table { width: 100%; border-collapse: collapse; margin-bottom: 26px; }
  th, td {
    padding: 9px 10px;
    text-align: ${dir === 'rtl' ? 'right' : 'left'};
    font-size: 10.5px;
    border-bottom: 1px solid #e8eaef;
  }
  thead th {
    background: #1f2a44;
    color: #fff;
    font-weight: 600;
    font-size: 10px;
    line-height: 1.35;
    border-bottom: none;
  }
  td.amount { white-space: nowrap; }
  td.strong { font-weight: 600; }
  td.muted { color: #667; }
  tbody tr:nth-child(even) td { background: #fafbfc; }
  /* A <tfoot> is a table-footer-group, which print engines repeat on every
     page a long table spans — the supplier total would then appear mid-list
     on each page as if it were the grand total. Render it as a plain row
     group so it prints once, after the last supplier. */
  tfoot { display: table-row-group; }
  tfoot td { font-weight: 700; background: #f0e6cc; border-bottom: none; }

  .lower { display: flex; align-items: flex-start; gap: 28px; }

  .summary-box {
    flex: 0 0 335px;
    background: #f7f8fa;
    border: 1px solid #e8eaef;
    border-radius: 8px;
    padding: 14px 18px;
  }
  .summary-title {
    font-size: 13px;
    font-weight: 700;
    padding-bottom: 8px;
    margin-bottom: 6px;
    border-bottom: 2px solid #c9a24b;
    display: inline-block;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 5px 0;
    font-size: 11.5px;
  }
  /* Both payable figures share one navy block — the subcontractor cares about
     the excl-VAT and incl-VAT amounts equally, so neither is a sub-row of the
     other. One block rather than two pills keeps them reading as a pair. */
  .summary-payable {
    background: #1f2a44;
    color: #fff;
    border-radius: 5px;
    padding: 7px 12px;
    margin-top: 8px;
  }
  .summary-payable .summary-row {
    font-weight: 700;
    font-size: 13px;
    padding: 3px 0;
  }

  .signature-block { flex: 1; text-align: center; padding-top: 18px; }
  .signature-block img { max-height: 130px; max-width: 100%; }
  .signature-block .caption { font-size: 10px; color: #667; margin-top: 6px; }

  .footer {
    margin: 40px 34px 0;
    padding-top: 12px;
    border-top: 1px solid #e8eaef;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #667;
  }
`;

/**
 * Renders one account-approval report as a single `.page` block — everything
 * that used to live directly in `<body>`. Split out so the client-wide
 * simulated export can embed several of these, one per project, inside
 * one shared document instead of duplicating this markup.
 */
export const renderReportApprovalPage = (data: ReportApprovalData): string => {
  const t = LABELS[data.lang];
  const locale = localeFor(data.lang);
  const money = (amount: number): string => formatCurrency(amount, locale);
  const monthLabel = formatMonthLabel(data.month, data.lang);

  // The backend writes the opening-balance tag in one fixed language, so it is
  // translated here to read right in either document language.
  const tagLabel = (tag: string | null): string =>
    tag === OPENING_BALANCE_TAG ? t.openingBalance : (tag ?? '');

  const statusCellHtml = (row: ReportApprovalRow): string =>
    data.screen
      ? `<td>${
          row.incomeDate
            ? `${t.received} ${formatDate(row.incomeDate, data.lang)}`
            : t.pending
        }</td>`
      : '';

  const rowsHtml = data.rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(tagLabel(row.tag))}</td>
          ${statusCellHtml(row)}
          <td class="amount strong">${money(row.approvedAmount)}</td>
          <td class="amount">${money(row.invoiceInclVat)}</td>
          <td class="amount muted">${row.profitMarginPercent}%</td>
          <td class="amount">${money(row.profitAmount)}</td>
          <td class="amount">${money(row.afterProfitAmount)}</td>
        </tr>`,
    )
    .join('');

  const supplierRowsHtml = data.supplierRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.supplierName)}</td>
          <td class="amount">${money(row.amount)}</td>
        </tr>`,
    )
    .join('');

  // No initiator on the project → the whole block is absent, not an empty
  // heading or a zero row. Initiator with no payments this month → the name
  // still prints, only the payment rows are conditional.
  const initiatorInfoRowHtml = data.initiator
    ? `<div class="info-row"><span class="label">${t.initiator}</span><span>${escapeHtml(data.initiator.name)}</span></div>`
    : '';

  const initiatorTableHtml =
    data.initiator && data.initiator.rows.length > 0
      ? `<table>
      <thead>
        <tr>
          <th>${t.initiatorPaymentDescription}</th>
          <th>${t.initiatorPaymentAmount}</th>
        </tr>
      </thead>
      <tbody>${data.initiator.rows
        .map(
          (row) => `
        <tr>
          <td>${escapeHtml(row.description)}</td>
          <td class="amount">${money(row.amount)}</td>
        </tr>`,
        )
        .join('')}</tbody>
    </table>`
      : '';

  // Empty when the caller has no approval text (the simulated export), so the
  // row does not open with a stray bullet.
  const approvedForValue = [data.approvedFor, data.projectName]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' • ');

  // Only the client-simulated export passes `screen`: the project's location
  // and description, and — where the simulation moved its margin — the stored
  // margin and profit it replaced, exactly as the project sheet shows them.
  const screenInfoRowsHtml = data.screen
    ? [
        data.screen.projectLocation
          ? `<div class="info-row"><span class="label">${t.location}</span><span>${escapeHtml(data.screen.projectLocation)}</span></div>`
          : '',
        data.screen.projectDescription
          ? `<div class="info-row"><span class="label">${t.projectDescription}</span><span>${escapeHtml(data.screen.projectDescription)}</span></div>`
          : '',
        data.screen.saved
          ? `<div class="info-row"><span class="label">${t.savedMargin}</span><span>${data.screen.saved.marginPercent}% • ${money(data.screen.saved.profitAmount)}</span></div>`
          : '',
      ].join('')
    : '';

  const simulatedBadgeHtml = data.screen?.saved
    ? `<span class="sim-badge">${t.simulated}</span>`
    : '';

  const statusHeaderHtml = data.screen ? `<th>${t.incomeStatus}</th>` : '';

  // The project sheet's "Profit (x%)" line: what the contractor keeps before
  // the suppliers and the subcontractor are paid.
  const profitSummaryRowHtml = data.screen
    ? `<div class="summary-row"><span>${t.profit} (${data.screen.marginPercent}%)</span><span>${money(data.totalIncome - data.totalAfterProfit)}</span></div>`
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
      <div class="info-row"><span class="label">${t.client}</span><span>${escapeHtml(data.requesterName)}</span></div>
      <div class="info-row"><span class="label">${t.mainContractor}</span><span>${escapeHtml(data.contractorName)} • ${t.companyNumberPrefix} ${escapeHtml(data.contractorCompanyNumber)}</span></div>
      <div class="info-row"><span class="label">${t.subcontractor}</span><span>${escapeHtml(data.subcontractorName)} • ${t.companyNumberPrefix} ${escapeHtml(data.subcontractorCompanyNumber)}</span></div>
      <div class="info-row"><span class="label">${t.approvedFor}</span><span>${approvedForValue}${simulatedBadgeHtml}</span></div>
      ${screenInfoRowsHtml}
      ${initiatorInfoRowHtml}
    </div>

    <table>
      <thead>
        <tr>
          <th>${t.tag}</th>
          ${statusHeaderHtml}
          <th>${t.approvedAmount}</th>
          <th>${t.invoiceInclVat}</th>
          <th>${t.profitMarginPercent}</th>
          <th>${t.profitAmount}</th>
          <th>${t.afterProfit}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th>${t.supplierName}</th>
          <th>${t.supplierInvoice}</th>
        </tr>
      </thead>
      <tbody>${supplierRowsHtml}</tbody>
      <tfoot>
        <tr>
          <td>${t.supplierTotal}</td>
          <td class="amount">${money(data.supplierTotal)}</td>
        </tr>
      </tfoot>
    </table>

    ${initiatorTableHtml}

    <div class="lower">
      <div class="summary-box">
        <div class="summary-title">${t.monthlySummary}</div>
        <div class="summary-row"><span>${t.totalIncome}</span><span>${money(data.totalIncome)}</span></div>
        ${profitSummaryRowHtml}
        <div class="summary-row"><span>${t.totalAfterProfit}</span><span>${money(data.totalAfterProfit)}</span></div>
        <div class="summary-row"><span>${t.totalDeductions}</span><span>${money(data.supplierTotal)}</span></div>
        <div class="summary-payable">
          <div class="summary-row"><span>${t.paymentExclVat}</span><span>${money(data.paymentExclVat)}</span></div>
          <div class="summary-row"><span>${t.paymentInclVat}</span><span>${money(data.paymentInclVat)}</span></div>
        </div>
      </div>

      <div class="signature-block">
        ${data.signature ? `<img src="${data.signature}" />` : ''}
        <div class="caption">${t.signature}</div>
      </div>
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

export const renderReportApprovalHtml = (data: ReportApprovalData): string => {
  const dir = dirFor(data.lang);
  return `<!DOCTYPE html>
<html dir="${dir}" lang="${data.lang}">
<head>
<meta charset="UTF-8" />
<style>${reportApprovalStyles(dir)}</style>
</head>
<body>
${renderReportApprovalPage(data)}
</body>
</html>`;
};
