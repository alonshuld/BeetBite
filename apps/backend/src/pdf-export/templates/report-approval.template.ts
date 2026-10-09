import { OPENING_BALANCE_TAG } from 'src/common/constants';

export interface ReportApprovalRow {
  tag: string | null;
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

export interface ReportApprovalData {
  lang: 'en' | 'he';
  contractorName: string;
  contractorCompanyNumber: string;
  contractorDescription: string | null;
  requesterName: string;
  subcontractorName: string;
  subcontractorCompanyNumber: string;
  projectName: string;
  /**
   * Description printed in the info box. The single-report export takes it
   * from the export dialog — typed for that document alone, never written
   * back to the project. Null prints no row at all.
   */
  projectDescription: string | null;
  /** Printed after the description as "description • location". */
  projectLocation: string | null;
  approvedFor: string;
  month: string;
  rows: ReportApprovalRow[];
  supplierRows: ReportApprovalSupplierRow[];
  supplierTotal: number;
  /**
   * Absent (not empty) when the project has no initiator — the whole
   * initiator block is then omitted entirely, not rendered with a zero row.
   * `income` is the report's own `initiatorIncome` — the caller guarantees it
   * is set whenever `initiator` is non-null (export refuses to run otherwise).
   */
  initiator: { name: string; income: number | null } | null;
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
  colors: PdfColors;
  font: PdfFont;
}

const LABELS = {
  he: {
    subtitlePrefix: 'אישור חשבון – חודש',
    client: 'שם המזמין:',
    tag: 'תיאור',
    mainContractor: 'קבלן:',
    subcontractor: 'קבלן משנה:',
    approvedFor: 'חשבון מאושר עבור:',
    approvedAmount: 'חשבון שאושר ע"י מזמין',
    invoiceInclVat: 'חשבונית כולל מע"מ',
    profitMarginPercent: 'רווח קבלני',
    profitAmount: 'סה"כ רווח (לפני מע"מ)',
    afterProfit: 'סה"כ בקיזוז רווח (לפני מע"מ)',
    supplierName: 'שם הספק',
    supplierInvoice: 'חשבונית ספקים (ללא מע"מ)',
    supplierTotal: 'סה"כ קיזוזי ספקים',
    initiator: 'יזם:',
    initiatorIncome: 'חשבון שאושר ע"י מזמין',
    monthlySummary: 'סיכום חודשי',
    totalIncome: 'סה"כ הכנסות',
    totalAfterProfit: 'סה"כ הכנסות לאחר קיזוז רווח קבלני',
    totalDeductions: 'סה"כ קיזוזים',
    paymentExclVat: 'לתשלום לפני מע"מ',
    paymentInclVat: 'לתשלום כולל מע"מ',
    signature: 'חתימה וחותמת מאשר',
    companyNumberPrefix: 'ח.פ.',
    openingBalance: 'יתרת פתיחה',
    projectDescription: 'תיאור הפרויקט:',
  },
  en: {
    subtitlePrefix: 'Account Approval –',
    client: 'Client:',
    tag: 'Tag',
    mainContractor: 'Main Contractor:',
    subcontractor: 'Subcontractor:',
    approvedFor: 'Approved For:',
    approvedAmount: 'Amount Approved by Client',
    invoiceInclVat: 'Invoice incl. VAT',
    profitMarginPercent: 'Profit Margin',
    profitAmount: 'Total Profit (excl. VAT)',
    afterProfit: 'Total After Profit (excl. VAT)',
    supplierName: 'Supplier',
    supplierInvoice: 'Supplier Invoice (excl. VAT)',
    supplierTotal: 'Total Supplier Deductions',
    initiator: 'Initiator:',
    initiatorIncome: 'Amount Approved by Client',
    monthlySummary: 'Monthly Summary',
    totalIncome: 'Total Income',
    totalAfterProfit: 'Total Income After Profit Cut',
    totalDeductions: 'Total Deductions',
    paymentExclVat: 'Payable Excl. VAT',
    paymentInclVat: 'Payable Incl. VAT',
    signature: 'Approving Signature & Stamp',
    companyNumberPrefix: 'Reg.',
    openingBalance: 'Opening balance',
    projectDescription: 'Description:',
  },
} as const;

import {
  escapeHtml,
  formatCurrency,
  formatMonthLabel,
  localeFor,
  dirFor,
  PdfColors,
  resolvePdfTheme,
} from './shared';
import { pdfFontCss } from './fonts';
import { PdfFont } from 'src/common/pdf-fonts';

/** The account-approval page's stylesheet. */
const reportApprovalStyles = (
  dir: 'rtl' | 'ltr',
  colors: PdfColors,
  font: PdfFont,
): string => {
  const theme = resolvePdfTheme(colors);
  const { fontFaces, fontFamily } = pdfFontCss(font);
  return `
  ${fontFaces}
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: ${fontFamily};
    color: #1f2430;
    margin: 0;
    font-size: 12px;
  }
  .page { padding: 0 0 28px; }
  .content { padding: 0 34px; }

  /* Full-bleed header band */
  .header {
    background: ${theme.primary};
    color: ${theme.onPrimary};
    padding: 20px 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 4px solid ${theme.secondary};
  }
  .header .identity { text-align: ${dir === 'rtl' ? 'right' : 'left'}; }
  .header .contractor-name { font-size: 26px; font-weight: 700; line-height: 1.15; }
  .header .contractor-desc { font-size: 12px; opacity: 0.8; margin-top: 3px; }
  .header .company-number { font-size: 11px; opacity: 0.65; margin-top: 4px; }
  .header .logo { max-height: 62px; max-width: 150px; }

  .title {
    text-align: center;
    font-size: 21px;
    font-weight: 700;
    margin: 26px 0 22px;
  }
  .title span { border-bottom: 3px solid ${theme.secondary}; padding-bottom: 6px; }

  /* Info box — secondary-color rule on the leading edge */
  .info-box {
    background: #f7f8fa;
    border-${dir === 'rtl' ? 'right' : 'left'}: 4px solid ${theme.secondary};
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 22px;
  }
  .info-row { display: flex; gap: 10px; padding: 3px 0; font-size: 12px; }
  .info-row .label { color: #667; font-weight: 700; min-width: 118px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 26px; }
  th, td {
    padding: 9px 10px;
    text-align: ${dir === 'rtl' ? 'right' : 'left'};
    font-size: 10.5px;
    border-bottom: 1px solid #e8eaef;
  }
  thead th {
    background: ${theme.primary};
    color: ${theme.onPrimary};
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
  tfoot td { font-weight: 700; background: ${theme.secondaryTint}; border-bottom: none; }

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
    border-bottom: 2px solid ${theme.secondary};
    display: inline-block;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 5px 0;
    font-size: 11.5px;
  }
  /* Both payable figures share one primary-color block — the subcontractor cares about
     the excl-VAT and incl-VAT amounts equally, so neither is a sub-row of the
     other. One block rather than two pills keeps them reading as a pair. */
  .summary-payable {
    background: ${theme.primary};
    color: ${theme.onPrimary};
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
};

/** Renders one account-approval report as a single `.page` block. */
const renderReportApprovalPage = (data: ReportApprovalData): string => {
  const t = LABELS[data.lang];
  const locale = localeFor(data.lang);
  const money = (amount: number): string => formatCurrency(amount, locale);
  const monthLabel = formatMonthLabel(data.month, data.lang);

  // The backend writes the opening-balance tag in one fixed language, so it is
  // translated here to read right in either document language.
  const tagLabel = (tag: string | null): string =>
    tag === OPENING_BALANCE_TAG ? t.openingBalance : (tag ?? '');

  // The initiator income is one figure for the whole report, so it is a single
  // cell spanning every income row rather than repeated per row. It sits just
  // before the approved amount in source order — visually to its right in RTL.
  const initiatorIncome =
    data.initiator && data.initiator.income != null
      ? data.initiator.income
      : null;

  const initiatorIncomeCellHtml = (index: number): string =>
    initiatorIncome != null && index === 0
      ? `<td class="amount" rowspan="${data.rows.length}">${money(initiatorIncome)}</td>`
      : '';

  const rowsHtml = data.rows
    .map(
      (row, index) => `
        <tr>
          <td>${escapeHtml(tagLabel(row.tag))}</td>
          ${initiatorIncomeCellHtml(index)}
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
  // heading or a zero row. When present it leads the info box.
  const initiatorInfoRowHtml = data.initiator
    ? `<div class="info-row"><span class="label">${t.initiator}</span><span>${escapeHtml(data.initiator.name)}</span></div>`
    : '';

  const initiatorIncomeHeaderHtml =
    initiatorIncome != null ? `<th>${t.initiatorIncome}</th>` : '';

  // Empty when there is no approval text, so the row does not open with a
  // stray bullet.
  const approvedForValue = [data.approvedFor, data.projectName]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' • ');

  // Description and location share one row; either may be missing, and the
  // row is left out when both are.
  const descriptionValue = [data.projectDescription, data.projectLocation]
    .filter((part): part is string => Boolean(part))
    .map(escapeHtml)
    .join(' • ');

  const infoRowsHtml = descriptionValue
    ? `<div class="info-row"><span class="label">${t.projectDescription}</span><span>${descriptionValue}</span></div>`
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
      ${initiatorInfoRowHtml}
      <div class="info-row"><span class="label">${t.client}</span><span>${escapeHtml(data.requesterName)}</span></div>
      <div class="info-row"><span class="label">${t.mainContractor}</span><span>${escapeHtml(data.contractorName)} • ${t.companyNumberPrefix} ${escapeHtml(data.contractorCompanyNumber)}</span></div>
      <div class="info-row"><span class="label">${t.subcontractor}</span><span>${escapeHtml(data.subcontractorName)} • ${t.companyNumberPrefix} ${escapeHtml(data.subcontractorCompanyNumber)}</span></div>
      <div class="info-row"><span class="label">${t.approvedFor}</span><span>${approvedForValue}</span></div>
      ${infoRowsHtml}
    </div>

    <table>
      <thead>
        <tr>
          <th>${t.tag}</th>
          ${initiatorIncomeHeaderHtml}
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

    <div class="lower">
      <div class="summary-box">
        <div class="summary-title">${t.monthlySummary}</div>
        <div class="summary-row"><span>${t.totalIncome}</span><span>${money(data.totalIncome)}</span></div>
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
<style>${reportApprovalStyles(dir, data.colors, data.font)}</style>
</head>
<body>
${renderReportApprovalPage(data)}
</body>
</html>`;
};
