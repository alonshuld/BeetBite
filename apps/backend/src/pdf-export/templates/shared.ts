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

/** The contractor's two brand colors, as `#rrggbb` (validated on write). */
export interface PdfColors {
  primary: string;
  secondary: string;
}

/** Every color the stylesheet paints, derived from the two brand colors. */
export interface PdfTheme extends PdfColors {
  /** Text on a primary-filled surface (header band, table heads). */
  onPrimary: string;
  /** Text on a secondary-filled surface (badges). */
  onSecondary: string;
  /** A pale wash of the secondary, for filled rows like the supplier total. */
  secondaryTint: string;
}

const DARK_TEXT = '#1f2430';
const LIGHT_TEXT = '#ffffff';

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const rgbToHex = (rgb: number[]): string =>
  `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

/** WCAG relative luminance, 0 (black) to 1 (white). */
const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Light or dark text, whichever reads better on `background` — the colors are
 * user-picked, so a pale primary must not leave white text on a white-ish band.
 */
const readableTextOn = (background: string): string =>
  contrast(background, LIGHT_TEXT) >= contrast(background, DARK_TEXT)
    ? LIGHT_TEXT
    : DARK_TEXT;

/** `hex` blended toward white, keeping `weight` (0–1) of the original. */
const tint = (hex: string, weight: number): string =>
  rgbToHex(hexToRgb(hex).map((c) => c * weight + 255 * (1 - weight)));

export const resolvePdfTheme = (colors: PdfColors): PdfTheme => ({
  primary: colors.primary,
  secondary: colors.secondary,
  onPrimary: readableTextOn(colors.primary),
  onSecondary: readableTextOn(colors.secondary),
  // 28% turns the original gold (#c9a24b) into ≈ the cream it always printed.
  secondaryTint: tint(colors.secondary, 0.28),
});
