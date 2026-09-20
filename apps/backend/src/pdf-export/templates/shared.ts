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
