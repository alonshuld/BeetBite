import { OPENING_BALANCE_TAG } from 'src/common/constants';
import { pdfFontCss } from './fonts';
import {
  escapeHtml,
  formatMonthLabel,
  localeFor,
  dirFor,
  PdfColors,
  resolvePdfTheme,
} from './shared';
import { PdfFont } from 'src/common/pdf-fonts';

export interface ClientSimulatedIncomeEntry {
  tag: string | null;
  /** When the income arrived, null while it is still pending. */
  incomeDate: string | null;
  amount: number;
}

/**
 * One project sheet, exactly as the Reports screen draws it — computed at the
 * margin the simulator left in force. The stored margin is deliberately not
 * carried: the document presents these figures as the figures.
 */
export interface ClientSimulatedProjectCard {
  projectName: string;
  projectLocation: string | null;
  projectDescription: string | null;
  incomeEntries: ClientSimulatedIncomeEntry[];
  totalIncome: number;
  margin: number;
  profit: number;
  suppliers: { name: string; amount: number }[];
  subcontractorName: string;
  subcontractorPayment: number;
  /** Absent (not empty) when the project has no initiator. */
  initiator: { name: string; income: number | null } | null;
}

export interface ClientSimulatedExportData {
  lang: 'en' | 'he';
  clientName: string;
  month: string;
  cards: ClientSimulatedProjectCard[];
  colors: PdfColors;
  font: PdfFont;
}

// Worded as the Reports screen words them, so the page reads like the sheets.
const LABELS = {
  he: {
    subtitlePrefix: 'דוח פרויקטים – חודש',
    client: 'לקוח:',
    totalIncome: 'סך הכנסות',
    totalSubcontractorPayments: 'סה"כ תשלומי קבלן',
    income: 'הכנסה',
    received: 'התקבל',
    pending: 'ממתין',
    profit: 'רווח',
    openingBalance: 'יתרת פתיחה',
    initiator: 'יזם',
    initiatorIncome: 'הכנסה מיזם',
    notConfigured: 'לא הוגדר',
  },
  en: {
    subtitlePrefix: 'Projects Report –',
    client: 'Client:',
    totalIncome: 'Total Income',
    totalSubcontractorPayments: 'Total Sub Payments',
    income: 'Income',
    received: 'Received',
    pending: 'Pending',
    profit: 'Profit',
    openingBalance: 'Opening balance',
    initiator: 'Initiator',
    initiatorIncome: 'Initiator Income',
    notConfigured: 'Not configured',
  },
} as const;

/** Whole shekels, as the screen prints them. */
const shekels = (amount: number, locale: string): string =>
  `₪${Math.round(amount).toLocaleString(locale)}`;

/** Month + year, as the screen dates a received payment. UTC: stored dates are UTC midnight. */
const formatReceivedDate = (iso: string, lang: 'en' | 'he'): string =>
  new Intl.DateTimeFormat(localeFor(lang), {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));

const styles = (colors: PdfColors, font: PdfFont): string => {
  const theme = resolvePdfTheme(colors);
  const { fontFaces, fontFamily } = pdfFontCss(font);
  return `
  ${fontFaces}
  /* No contractor header or footer: the page is just the client's sheets. */
  @page { size: A4; margin: 22px 0; }
  * { box-sizing: border-box; }
  body {
    font-family: ${fontFamily};
    color: #1f2430;
    margin: 0;
    font-size: 11px;
  }
  .content { padding: 0 30px; }

  .title {
    text-align: center;
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 18px;
  }
  .title span { border-bottom: 3px solid ${theme.secondary}; padding-bottom: 6px; }

  /* The client header: whose sheets these are, and the two running figures. */
  .client-bar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    padding-bottom: 12px;
    margin-bottom: 16px;
    border-bottom: 1px solid #e3e5ea;
  }
  .client-bar .client-name { font-size: 18px; font-weight: 700; }
  .client-bar .client-label { font-size: 10px; color: #667; }
  .figures { display: flex; gap: 24px; }
  .figure { display: flex; flex-direction: column; gap: 2px; }
  .figure .figure-label { font-size: 10px; color: #667; }
  .figure .figure-value { font-size: 16px; font-weight: 700; }

  /* One rectangle per project, two abreast like the screen's grid. */
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card {
    border: 1px solid #d9dce3;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    break-inside: avoid;
  }
  .card-head { padding: 11px 13px 9px; border-bottom: 1px solid #e8eaef; }
  .card-name { font-size: 13px; font-weight: 700; }
  .card-location { font-size: 10.5px; color: #667; margin-top: 2px; }
  .card-desc { font-size: 9.5px; color: #8a8f9c; margin-top: 2px; }

  .statement { flex: 1; padding: 8px 13px 10px; }
  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 3px 0;
  }
  .row .label { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
  .row .amount { white-space: nowrap; }
  .row.total { font-weight: 600; }
  .row.positive .amount { color: #1e7a46; font-weight: 600; }
  .row.deduction { color: #555b68; }
  .row.emphasis { font-size: 12.5px; font-weight: 700; }
  .rule { border-top: 1px solid #d9dce3; margin: 4px 0; }
  .total-rule { border-top: 3px double #9a9fab; margin: 5px 0; }

  .badge {
    font-size: 8.5px;
    font-weight: 600;
    border-radius: 3px;
    padding: 1px 5px;
    white-space: nowrap;
  }
  .badge.received { background: #e3f3ea; color: #1e7a46; }
  .badge.pending { background: #fbf0dc; color: #8a5a10; }

  .initiator {
    border-top: 1px dashed #d9dce3;
    padding: 7px 13px 9px;
    color: #8a8f9c;
    font-size: 10px;
  }
  .initiator .initiator-name { font-size: 9.5px; font-weight: 600; margin-bottom: 2px; }
`;
};

const renderCard = (
  card: ClientSimulatedProjectCard,
  lang: 'en' | 'he',
): string => {
  const t = LABELS[lang];
  const locale = localeFor(lang);
  const money = (amount: number): string =>
    `<span class="amount" dir="ltr">${shekels(amount, locale)}</span>`;

  // The backend writes the opening-balance tag in one fixed language, so it is
  // translated here to read right in either document language.
  const tagLabel = (tag: string | null): string =>
    tag === OPENING_BALANCE_TAG ? t.openingBalance : (tag ?? t.income);

  const incomeRowsHtml = card.incomeEntries
    .map((entry) => {
      const badge = entry.incomeDate
        ? `<span class="badge received">${t.received} ${formatReceivedDate(entry.incomeDate, lang)}</span>`
        : `<span class="badge pending">${t.pending}</span>`;
      return `<div class="row"><span class="label"><span>${escapeHtml(tagLabel(entry.tag))}</span>${badge}</span>${money(entry.amount)}</div>`;
    })
    .join('');

  const totalIncomeHtml =
    card.incomeEntries.length > 1
      ? `<div class="rule"></div><div class="row total"><span class="label">${t.totalIncome}</span>${money(card.totalIncome)}</div>`
      : '';

  const supplierRowsHtml = card.suppliers
    .map(
      (supplier) =>
        `<div class="row deduction"><span class="label">${escapeHtml(supplier.name)}</span><span class="amount" dir="ltr">− ${shekels(supplier.amount, locale)}</span></div>`,
    )
    .join('');

  // Informational only, outside the account — as on the screen. No initiator
  // on the project → the section is absent.
  const initiatorHtml = card.initiator
    ? `<div class="initiator">
        <div class="initiator-name">${t.initiator}: ${escapeHtml(card.initiator.name)}</div>
        <div class="row"><span class="label">${t.initiatorIncome}</span>${
          card.initiator.income != null
            ? money(card.initiator.income)
            : `<span class="amount">${t.notConfigured}</span>`
        }</div>
      </div>`
    : '';

  return `<div class="card">
    <div class="card-head">
      <div class="card-name">${escapeHtml(card.projectName)}</div>
      ${card.projectLocation ? `<div class="card-location">${escapeHtml(card.projectLocation)}</div>` : ''}
      ${card.projectDescription ? `<div class="card-desc">${escapeHtml(card.projectDescription)}</div>` : ''}
    </div>
    <div class="statement">
      ${incomeRowsHtml}
      ${totalIncomeHtml}
      <div class="rule"></div>
      <div class="row positive"><span class="label">${t.profit} (${card.margin}%)</span>${money(card.profit)}</div>
      ${supplierRowsHtml}
      <div class="total-rule"></div>
      <div class="row total emphasis"><span class="label">${escapeHtml(card.subcontractorName)}</span>${money(card.subcontractorPayment)}</div>
    </div>
    ${initiatorHtml}
  </div>`;
};

/**
 * The client's project sheets for one month, as the Reports screen lays them
 * out: the client header with its two totals, then one rectangle per project.
 */
export const renderClientSimulatedExportHtml = (
  data: ClientSimulatedExportData,
): string => {
  const t = LABELS[data.lang];
  const locale = localeFor(data.lang);
  const dir = dirFor(data.lang);
  const monthLabel = formatMonthLabel(data.month, data.lang);

  const totalIncome = data.cards.reduce((sum, c) => sum + c.totalIncome, 0);
  const totalSubcontractor = data.cards.reduce(
    (sum, c) => sum + c.subcontractorPayment,
    0,
  );

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${data.lang}">
<head>
<meta charset="UTF-8" />
<style>${styles(data.colors, data.font)}</style>
</head>
<body>
  <div class="content">
    <div class="title"><span>${t.subtitlePrefix} ${monthLabel}</span></div>

    <div class="client-bar">
      <div>
        <div class="client-label">${t.client}</div>
        <div class="client-name">${escapeHtml(data.clientName)}</div>
      </div>
      <div class="figures">
        <div class="figure">
          <span class="figure-label">${t.totalIncome}</span>
          <span class="figure-value" dir="ltr">${shekels(totalIncome, locale)}</span>
        </div>
        <div class="figure">
          <span class="figure-label">${t.totalSubcontractorPayments}</span>
          <span class="figure-value" dir="ltr">${shekels(totalSubcontractor, locale)}</span>
        </div>
      </div>
    </div>

    <div class="cards">
      ${data.cards.map((card) => renderCard(card, data.lang)).join('')}
    </div>
  </div>

</body>
</html>`;
};
