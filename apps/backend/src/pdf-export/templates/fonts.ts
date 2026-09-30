import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { DEFAULT_PDF_FONT, PdfFont } from 'src/common/pdf-fonts';

/** What the stylesheet needs to paint text in the chosen font. */
export interface PdfFontCss {
  /** `@font-face` rules embedding the font, empty for the system default. */
  fontFaces: string;
  /** The `font-family` value for the document body. */
  fontFamily: string;
}

// The system fonts the backend image installs. Every stack ends on them, so a
// glyph the chosen font lacks still renders instead of printing as tofu.
const SYSTEM_STACK = '"Noto Sans Hebrew", "Noto Sans", Arial';

const EMBEDDED_FONTS: Record<
  Exclude<PdfFont, typeof DEFAULT_PDF_FONT>,
  { family: string; generic: 'sans-serif' | 'serif' }
> = {
  heebo: { family: 'Heebo', generic: 'sans-serif' },
  rubik: { family: 'Rubik', generic: 'sans-serif' },
  assistant: { family: 'Assistant', generic: 'sans-serif' },
  'frank-ruhl-libre': { family: 'Frank Ruhl Libre', generic: 'serif' },
  'david-libre': { family: 'David Libre', generic: 'serif' },
};

// The weights the stylesheet uses (body, table heads, headings). A weight a
// family does not ship is skipped; Chromium falls back to the nearest one.
const WEIGHTS = [400, 600, 700];

// The documents only hold Hebrew and Latin text — ₪ sits in the Hebrew subset.
const SUBSETS = ['hebrew', 'latin'];

// Matches one fontsource `@font-face` block with the comment naming its file,
// e.g. `/* heebo-hebrew-400-normal */ @font-face { ... }`.
const FONT_FACE_BLOCK = /\/\* (\S+) \*\/\s*@font-face \{([^}]*)\}/g;

/**
 * Builds the `@font-face` rules for one bundled font from its fontsource
 * stylesheets, reusing their `unicode-range`s so the Hebrew and Latin files
 * each serve their own characters. The font files are inlined as base64: the
 * page is set with `setContent`, so it has no origin to load files from.
 */
const buildFontFaces = (font: PdfFont): string => {
  const packageDir = dirname(require.resolve(`@fontsource/${font}/400.css`));

  return WEIGHTS.flatMap((weight) => {
    const cssPath = join(packageDir, `${weight}.css`);
    if (!existsSync(cssPath)) return [];

    const css = readFileSync(cssPath, 'utf8');
    return [...css.matchAll(FONT_FACE_BLOCK)]
      .filter(([, name]) =>
        SUBSETS.some((subset) => name === `${font}-${subset}-${weight}-normal`),
      )
      .map(([, name, body]) => {
        const woff2 = readFileSync(join(packageDir, 'files', `${name}.woff2`));
        const src = `src: url(data:font/woff2;base64,${woff2.toString('base64')}) format('woff2');`;
        return `@font-face {${body.replace(/src:[^;]*;/, src)}}`;
      });
  }).join('\n');
};

const cache = new Map<PdfFont, PdfFontCss>();

/**
 * The CSS for rendering a PDF in `font`. Built once per font and cached: the
 * files never change while the process runs, and each export would otherwise
 * re-read and re-encode them.
 */
export const pdfFontCss = (font: PdfFont): PdfFontCss => {
  const cached = cache.get(font);
  if (cached) return cached;

  const result: PdfFontCss =
    font === DEFAULT_PDF_FONT
      ? { fontFaces: '', fontFamily: `${SYSTEM_STACK}, sans-serif` }
      : {
          fontFaces: buildFontFaces(font),
          fontFamily: `"${EMBEDDED_FONTS[font].family}", ${SYSTEM_STACK}, ${EMBEDDED_FONTS[font].generic}`,
        };

  cache.set(font, result);
  return result;
};
