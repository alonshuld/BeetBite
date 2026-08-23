export interface ReportApprovalRow {
  projectName: string;
  tag: string | null;
  approvedAmount: number;
  invoiceInclVat: number;
  profitMarginPercent: number;
  profitAmount: number;
  afterProfitAmount: number;
}

export interface ReportApprovalSupplierRow {
  corporationName: string;
  amount: number;
}

export interface ReportApprovalData {
  lang: 'en' | 'he';
  contractorName: string;
  contractorCompanyNumber: string;
  clientName: string;
  subcontractorName: string;
  subcontractorCompanyNumber: string;
  approvedFor: string;
  month: string;
  rows: ReportApprovalRow[];
  supplierRows: ReportApprovalSupplierRow[];
  supplierTotal: number;
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
}

const LABELS = {
  he: {
    subtitlePrefix: 'אישור חשבון – חודש',
    client: 'שם המזמין',
    tag: 'תיאור',
    mainContractor: 'קבלן ראשי',
    subcontractor: 'קבלן משנה',
    approvedFor: 'חשבון מאושר עבור',
    approvedAmount: 'חשבון שאושר',
    invoiceInclVat: 'חשבונית כולל מע"מ',
    profitMarginPercent: '% רווח קבלני',
    profitAmount: 'סה"כ רווח (לפני מע"מ)',
    afterProfit: 'סה"כ בקיזוז רווח',
    supplierName: 'שם הספק',
    supplierInvoice: 'חשבונית ספקים (ללא מע"מ)',
    supplierTotal: 'סה"כ קיזוזי ספקים',
    monthlySummary: 'סיכום חודשי',
    totalIncome: 'סה"כ הכנסות',
    totalAfterProfit: 'סה"כ הכנסות לאחר קיזוז רווח קבלני',
    totalDeductions: 'סה"כ קיזוזים',
    paymentExclVat: 'לתשלום לפני מע"מ',
    paymentInclVat: 'לתשלום כולל מע"מ',
    signature: 'חתימה וחותמת מאשר',
  },
  en: {
    subtitlePrefix: 'Account Approval –',
    client: 'Client',
    tag: 'Tag',
    mainContractor: 'Main Contractor',
    subcontractor: 'Subcontractor',
    approvedFor: 'Approved For',
    approvedAmount: 'Approved Amount',
    invoiceInclVat: 'Invoice incl. VAT',
    profitMarginPercent: 'Profit Margin %',
    profitAmount: 'Total Profit (excl. VAT)',
    afterProfit: 'Total After Profit',
    supplierName: 'Supplier',
    supplierInvoice: 'Supplier Invoice (excl. VAT)',
    supplierTotal: 'Total Supplier Deductions',
    monthlySummary: 'Monthly Summary',
    totalIncome: 'Total Income',
    totalAfterProfit: 'Total Income After Profit Cut',
    totalDeductions: 'Total Deductions',
    paymentExclVat: 'Payable Excl. VAT',
    paymentInclVat: 'Payable Incl. VAT',
    signature: 'Approving Signature & Stamp',
  },
} as const;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatCurrency = (amount: number, locale: string): string =>
  `₪${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatMonthLabel = (monthIso: string, lang: 'en' | 'he'): string =>
  new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(monthIso));

export const renderReportApprovalHtml = (data: ReportApprovalData): string => {
  const t = LABELS[data.lang];
  const dir = data.lang === 'he' ? 'rtl' : 'ltr';
  const locale = data.lang === 'he' ? 'he-IL' : 'en-GB';
  const money = (amount: number): string => formatCurrency(amount, locale);
  const monthLabel = formatMonthLabel(data.month, data.lang);

  const rowsHtml = data.rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.projectName)}</td>
          <td>${escapeHtml(row.tag ?? '')}</td>
          <td>${money(row.approvedAmount)}</td>
          <td>${money(row.invoiceInclVat)}</td>
          <td>${row.profitMarginPercent}%</td>
          <td>${money(row.profitAmount)}</td>
          <td>${money(row.afterProfitAmount)}</td>
        </tr>`,
    )
    .join('');

  const supplierRowsHtml = data.supplierRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.corporationName)}</td>
          <td>${money(row.amount)}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${data.lang}">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans Hebrew", "Noto Sans", Arial, sans-serif;
    color: #1f2430;
    margin: 0;
    padding: 32px 40px;
    font-size: 12px;
  }
  h1, h2, h3 { margin: 0; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #c9a24b;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .header .logo { max-height: 60px; max-width: 160px; }
  .header .contractor-name { font-size: 22px; font-weight: 700; }
  .header .company-number { font-size: 11px; color: #667; }
  .title { font-size: 18px; font-weight: 700; margin: 12px 0 20px; }
  .info-box {
    background: #f4f5f7;
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 20px;
  }
  .info-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .info-row .label { color: #667; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { padding: 8px 10px; text-align: ${dir === 'rtl' ? 'right' : 'left'}; font-size: 11px; }
  thead th {
    background: #1f2a44;
    color: #fff;
    font-weight: 600;
  }
  tbody tr:nth-child(even) { background: #f7f8fa; }
  tfoot td { font-weight: 700; background: #f0e6cc; }
  .section-title {
    font-size: 13px;
    font-weight: 700;
    margin: 20px 0 8px;
  }
  .summary-box {
    background: #1f2a44;
    color: #fff;
    border-radius: 6px;
    padding: 16px 20px;
    width: 320px;
    margin-inline-start: auto;
  }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .summary-row.total { font-weight: 700; font-size: 14px; border-top: 1px solid rgba(255,255,255,0.3); margin-top: 6px; padding-top: 8px; }
  /* The two payable rows read as one block: only the first carries the divider. */
  .summary-row.total + .summary-row.total { border-top: none; margin-top: 0; padding-top: 4px; }
  .footer {
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 10px;
    color: #667;
  }
  .footer .signature-block { text-align: center; }
  .footer .signature-block img { max-height: 70px; display: block; margin: 0 auto 6px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="contractor-name">${escapeHtml(data.contractorName)}</div>
      <div class="company-number">${escapeHtml(data.contractorCompanyNumber)}</div>
    </div>
    ${data.logo ? `<img class="logo" src="${data.logo}" />` : ''}
  </div>

  <div class="title">${t.subtitlePrefix} ${monthLabel}</div>

  <div class="info-box">
    <div class="info-row"><span class="label">${t.client}</span><span>${escapeHtml(data.clientName)}</span></div>
    <div class="info-row"><span class="label">${t.mainContractor}</span><span>${escapeHtml(data.contractorName)} · ${escapeHtml(data.contractorCompanyNumber)}</span></div>
    <div class="info-row"><span class="label">${t.subcontractor}</span><span>${escapeHtml(data.subcontractorName)} · ${escapeHtml(data.subcontractorCompanyNumber)}</span></div>
    <div class="info-row"><span class="label">${t.approvedFor}</span><span>${escapeHtml(data.approvedFor)}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th></th>
        <th>${t.tag}</th>
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
        <td>${money(data.supplierTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="section-title">${t.monthlySummary}</div>
  <div class="summary-box">
    <div class="summary-row"><span>${t.totalIncome}</span><span>${money(data.totalIncome)}</span></div>
    <div class="summary-row"><span>${t.totalAfterProfit}</span><span>${money(data.totalAfterProfit)}</span></div>
    <div class="summary-row"><span>${t.totalDeductions}</span><span>${money(data.supplierTotal)}</span></div>
    <div class="summary-row total"><span>${t.paymentExclVat}</span><span>${money(data.paymentExclVat)}</span></div>
    <div class="summary-row total"><span>${t.paymentInclVat}</span><span>${money(data.paymentInclVat)}</span></div>
  </div>

  <div class="footer">
    <div class="signature-block">
      ${data.signature ? `<img src="${data.signature}" />` : ''}
      <div>${t.signature}</div>
    </div>
    <div>
      ${[data.companyAddress, data.companyPhone, data.companyEmail]
        .filter((value): value is string => Boolean(value))
        .map(escapeHtml)
        .join(' · ')}
    </div>
  </div>
</body>
</html>`;
};
