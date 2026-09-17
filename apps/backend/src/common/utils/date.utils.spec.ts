import {
  normalizeToDayStart,
  normalizeToDayStartForTransform,
  normalizeToMonthStart,
  normalizeToMonthStartForTransform,
} from './date.utils';

describe('date.utils', () => {
  describe('normalizeToMonthStart', () => {
    it('collapses a date to the first of its month', () => {
      expect(normalizeToMonthStart('2026-09-17')).toBe(
        '2026-09-01T00:00:00.000Z',
      );
    });

    it('throws on an unparseable date', () => {
      expect(() => normalizeToMonthStart('not-a-date')).toThrow('Invalid date');
    });
  });

  describe('normalizeToDayStart', () => {
    // 🔴 The whole point of this helper: keep the day. Collapsing to the month
    // start here would silently rewrite when the money moved.
    it('keeps the day of the month', () => {
      expect(normalizeToDayStart('2026-09-17')).toBe(
        '2026-09-17T00:00:00.000Z',
      );
    });

    it('drops the time of day', () => {
      expect(normalizeToDayStart('2026-09-17T13:45:12.000Z')).toBe(
        '2026-09-17T00:00:00.000Z',
      );
    });

    it('throws on an unparseable date', () => {
      expect(() => normalizeToDayStart('not-a-date')).toThrow('Invalid date');
    });
  });

  describe('normalizeToDayStartForTransform', () => {
    // A date-only string passes @IsISO8601() but Prisma rejects it as a
    // DateTime. Widening it here is what keeps it usable at the DB.
    it('widens a date-only string into a full UTC timestamp', () => {
      expect(normalizeToDayStartForTransform('2026-09-17')).toBe(
        '2026-09-17T00:00:00.000Z',
      );
    });

    it('returns unparseable input untouched so the validator can reject it', () => {
      expect(normalizeToDayStartForTransform('not-a-date')).toBe('not-a-date');
    });

    it('returns non-string input untouched', () => {
      expect(normalizeToDayStartForTransform(undefined)).toBeUndefined();
      expect(normalizeToDayStartForTransform(null)).toBeNull();
    });
  });

  describe('normalizeToMonthStartForTransform', () => {
    it('returns unparseable input untouched so the validator can reject it', () => {
      expect(normalizeToMonthStartForTransform('not-a-date')).toBe(
        'not-a-date',
      );
    });
  });
});
