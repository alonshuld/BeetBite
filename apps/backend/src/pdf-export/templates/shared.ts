/**
 * Small primitives shared by every PDF template. Keep this file free of
 * anything document-specific — it exists so two templates never drift on how
 * they escape, format money, or format a month label.
 */

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const formatCurrency = (amount: number, locale: string): string =>
  `${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₪`;

export const formatMonthLabel = (monthIso: string, lang: 'en' | 'he'): string =>
  new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(monthIso));

export const localeFor = (lang: 'en' | 'he'): string =>
  lang === 'he' ? 'he-IL' : 'en-GB';

export const dirFor = (lang: 'en' | 'he'): 'rtl' | 'ltr' =>
  lang === 'he' ? 'rtl' : 'ltr';

/**
 * A calendar date (day, month, year). Pinned to UTC because stored dates are
 * UTC midnight — formatting in the server's zone could print the day before.
 */
export const formatDate = (iso: string, lang: 'en' | 'he'): string =>
  new Intl.DateTimeFormat(localeFor(lang), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));

/** Like formatCurrency, but with an explicit "+"/"−" for a change vs a baseline. */
export const formatSignedCurrency = (
  amount: number,
  locale: string,
): string => {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
  return `${sign}${formatCurrency(Math.abs(amount), locale)}`;
};
