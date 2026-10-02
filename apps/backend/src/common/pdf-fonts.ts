/**
 * Fonts a contractor can pick for the exported PDFs, stored by id on
 * `CompanySettings.pdfFont`. Every one covers Hebrew, since the documents are
 * mostly Hebrew. The default is the system Noto stack the PDFs always
 * rendered in; the rest are bundled from `@fontsource` and embedded in the
 * document (see `pdf-export/templates/fonts.ts`).
 */
export const PDF_FONTS = [
  'noto-sans-hebrew',
  'heebo',
  'rubik',
  'assistant',
  'frank-ruhl-libre',
  'david-libre',
] as const;

export type PdfFont = (typeof PDF_FONTS)[number];

export const DEFAULT_PDF_FONT = 'noto-sans-hebrew' satisfies PdfFont;

export const isPdfFont = (value: string): value is PdfFont =>
  (PDF_FONTS as readonly string[]).includes(value);
