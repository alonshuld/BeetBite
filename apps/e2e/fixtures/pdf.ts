/**
 * Structural assertions for PDF bytes, with no PDF library behind them.
 *
 * Reading text back out of these documents is deliberately out of scope: the
 * template embeds subset Hebrew fonts, so extracted text is unreliable, and
 * every figure worth asserting is checked against the rendered HTML in
 * `apps/backend/test/pdf-export.e2e-spec.ts`. Here we only care that the bytes
 * really are a PDF of the expected size.
 */
import { expect } from '@playwright/test';

/** Every PDF starts with this signature. */
const PDF_MAGIC = '%PDF-';

/** …and ends with this marker, possibly followed by trailing whitespace. */
const PDF_EOF = '%%EOF';

/**
 * Asserts the buffer is a structurally complete PDF — right magic bytes, and an
 * end-of-file marker proving the response was not truncated mid-stream.
 */
export function expectValidPdf(buffer: Buffer): void {
  expect(
    buffer.length,
    'PDF should not be empty — an empty body usually means the export 4xx-ed',
  ).toBeGreaterThan(0);

  expect(
    buffer.subarray(0, PDF_MAGIC.length).toString('latin1'),
    'buffer should start with the PDF magic bytes',
  ).toBe(PDF_MAGIC);

  // The trailer lives at the very end; 1KB is ample and avoids scanning a
  // multi-megabyte document for a five-character marker.
  const trailer = buffer.subarray(Math.max(0, buffer.length - 1024));
  expect(
    trailer.toString('latin1'),
    'buffer should end with the PDF EOF marker',
  ).toContain(PDF_EOF);
}

/**
 * Counts the page objects in a PDF.
 *
 * Matches `/Type /Page` but not `/Type /Pages` (the page-tree root) via the
 * negative lookahead — otherwise every document would read one page too many.
 * Puppeteer writes these uncompressed for a document this simple, so a byte
 * scan is enough.
 */
export function pdfPageCount(buffer: Buffer): number {
  const matches = buffer.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g);
  return matches ? matches.length : 0;
}
