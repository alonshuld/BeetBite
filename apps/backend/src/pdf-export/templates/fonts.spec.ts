import { PDF_FONTS } from 'src/common/pdf-fonts';
import { pdfFontCss } from './fonts';

describe('pdfFontCss', () => {
  it('keeps the system Noto stack, with nothing embedded, for the default', () => {
    const { fontFaces, fontFamily } = pdfFontCss('noto-sans-hebrew');

    expect(fontFaces).toBe('');
    expect(fontFamily).toBe(
      '"Noto Sans Hebrew", "Noto Sans", Arial, sans-serif',
    );
  });

  it('embeds the Hebrew and Latin files of a bundled font as base64', () => {
    const { fontFaces, fontFamily } = pdfFontCss('heebo');

    expect(fontFamily).toBe(
      '"Heebo", "Noto Sans Hebrew", "Noto Sans", Arial, sans-serif',
    );
    // hebrew + latin × 400/600/700
    expect(fontFaces.match(/@font-face/g)).toHaveLength(6);
    expect(fontFaces).toContain("font-family: 'Heebo'");
    expect(fontFaces).toContain('url(data:font/woff2;base64,');
    expect(fontFaces).toContain('U+0590-05FF');
    // No relative file URLs left for Chromium to fail on, no other subsets.
    expect(fontFaces).not.toContain('./files/');
    expect(fontFaces).not.toContain('.woff)');
    expect(fontFaces).not.toContain('U+0100-02BA');
  });

  it('skips a weight the family does not ship', () => {
    // David Libre has no 600.
    expect(
      pdfFontCss('david-libre').fontFaces.match(/@font-face/g),
    ).toHaveLength(4);
  });

  it.each(PDF_FONTS.filter((font) => font !== 'noto-sans-hebrew'))(
    'resolves the files of %s',
    (font) => {
      expect(pdfFontCss(font).fontFaces).toContain('font-weight: 700');
    },
  );
});
