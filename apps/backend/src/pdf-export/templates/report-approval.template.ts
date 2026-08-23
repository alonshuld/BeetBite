export interface ReportApprovalRow {
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
  contractorDescription: string | null;
  clientName: string;
  subcontractorName: string;
  subcontractorCompanyNumber: string;
  projectName: string;
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
    client: 'שם המזמין:',
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
    monthlySummary: 'סיכום חודשי',
    totalIncome: 'סה"כ הכנסות',
    totalAfterProfit: 'סה"כ הכנסות לאחר קיזוז רווח קבלני',
    totalDeductions: 'סה"כ קיזוזים',
    paymentExclVat: 'לתשלום לפני מע"מ',
    paymentInclVat: 'לתשלום כולל מע"מ',
    signature: 'חתימה וחותמת מאשר',
    companyNumberPrefix: 'ח.פ.',
  },
  en: {
    subtitlePrefix: 'Account Approval –',
    client: 'Client:',
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
    monthlySummary: 'Monthly Summary',
    totalIncome: 'Total Income',
    totalAfterProfit: 'Total Income After Profit Cut',
    totalDeductions: 'Total Deductions',
    paymentExclVat: 'Payable Excl. VAT',
    paymentInclVat: 'Payable Incl. VAT',
    signature: 'Approving Signature & Stamp',
    companyNumberPrefix: 'Reg.',
  },
} as const;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatCurrency = (amount: number, locale: string): string =>
  `${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₪`;

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

  // The income and supplier lists are independent: a report can owe four
  // suppliers against two income entries. They share one grid, so pad the
  // shorter side with empty cells rather than pairing rows that do not relate.
  const bodyRowCount = Math.max(data.rows.length, data.supplierRows.length);
  const bodyRowsHtml = Array.from({ length: bodyRowCount }, (_, index) => {
    const row = data.rows[index];
    const supplier = data.supplierRows[index];

    const incomeCells = row
      ? `
          <td class="amount strong">
            ${money(row.approvedAmount)}
            ${row.tag ? `<span class="tag">${escapeHtml(row.tag)}</span>` : ''}
          </td>
          <td class="amount">${money(row.invoiceInclVat)}</td>
          <td class="amount muted">${row.profitMarginPercent}%</td>
          <td class="amount">${money(row.profitAmount)}</td>
          <td class="amount">${money(row.afterProfitAmount)}</td>`
      : `
          <td class="empty"></td><td class="empty"></td>
          <td class="empty"></td><td class="empty"></td><td class="empty"></td>`;

    const supplierCells = supplier
      ? `
          <td>${escapeHtml(supplier.corporationName)}</td>
          <td class="amount">${money(supplier.amount)}</td>`
      : `<td class="empty"></td><td class="empty"></td>`;

    return `<tr>${incomeCells}${supplierCells}</tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${data.lang}">
<head>
<meta charset="UTF-8" />
<style>
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
  td.empty { border-bottom: 1px solid #e8eaef; }
  tbody tr:nth-child(even) td { background: #fafbfc; }
  .tag {
    display: inline-block;
    margin-inline-start: 6px;
    background: #c9a24b;
    color: #fff;
    border-radius: 3px;
    padding: 1px 7px;
    font-size: 9px;
    font-weight: 700;
    vertical-align: middle;
  }
  /* A <tfoot> is a table-footer-group, which print engines repeat on every
     page a long table spans — the totals row would then appear mid-list on
     each page as if it were the grand total. Render it as a plain row group
     so it prints once, after the last row. */
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
  .summary-row.total {
    background: #1f2a44;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    border-radius: 5px;
    padding: 9px 12px;
    margin-top: 8px;
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
</style>
</head>
<body>
<div class="page">
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
      <div class="info-row"><span class="label">${t.subcontractor}</span><span>${escapeHtml(data.subcontractorName)} • ${t.companyNumberPrefix} ${escapeHtml(data.subcontractorCompanyNumber)}</span></div>
      <div class="info-row"><span class="label">${t.approvedFor}</span><span>${escapeHtml(data.approvedFor)} • ${escapeHtml(data.projectName)}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>${t.approvedAmount}</th>
          <th>${t.invoiceInclVat}</th>
          <th>${t.profitMarginPercent}</th>
          <th>${t.profitAmount}</th>
          <th>${t.afterProfit}</th>
          <th>${t.supplierName}</th>
          <th>${t.supplierInvoice}</th>
        </tr>
      </thead>
      <tbody>${bodyRowsHtml}</tbody>
      <tfoot>
        <tr>
          <td class="empty"></td><td class="empty"></td><td class="empty"></td>
          <td class="empty"></td><td class="empty"></td>
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
        <div class="summary-row"><span>${t.paymentExclVat}</span><span>${money(data.paymentExclVat)}</span></div>
        <div class="summary-row total"><span>${t.paymentInclVat}</span><span>${money(data.paymentInclVat)}</span></div>
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
</div>
</body>
</html>`;
};
