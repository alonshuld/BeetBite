import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Every error code the API can return must have a Hebrew message in the
 * frontend, or a Hebrew user sees a generic fallback instead of the reason.
 * Codes are string literals in the `errors/` directories; the frontend's
 * table is `apps/frontend/src/api/apiErrors.ts`.
 */
describe('error codes', () => {
  const srcRoot = join(__dirname, '..', '..');
  const frontendTable = join(
    srcRoot,
    '..',
    '..',
    'frontend',
    'src',
    'api',
    'apiErrors.ts',
  );

  function errorFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return errorFiles(path);
      return /[\\/]errors[\\/][^\\/]+\.ts$/.test(path) &&
        !path.endsWith('.spec.ts')
        ? [path]
        : [];
    });
  }

  const codes = new Set(
    errorFiles(srcRoot).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/'([A-Z]+(?:_[A-Z]+)+)'/g)].map(
        (m) => m[1],
      ),
    ),
  );

  it('finds the codes', () => {
    expect(codes.size).toBeGreaterThan(20);
  });

  it('has a Hebrew translation for every code', () => {
    const table = readFileSync(frontendTable, 'utf8');
    const missing = [...codes].filter(
      (code) => !new RegExp(`^\\s*${code}:`, 'm').test(table),
    );
    expect(missing).toEqual([]);
  });
});
