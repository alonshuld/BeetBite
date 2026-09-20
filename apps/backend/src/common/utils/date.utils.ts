/**
 * Normalizes the given  date to be the UTC value of its month's start.
 * @param dateStr The stringified date.
 * @returns The stringified UTC date of the month's start.
 * */
export const normalizeToMonthStart = (dateStr: string): string => {
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }

  // Set to UTC first day of the month at 00:00:00
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  return normalized.toISOString();
};

/**
 * Month-start normalization for DTO `@Transform` callbacks.
 *
 * Returns the value untouched when it is not a parseable date, leaving the
 * field's own `@IsISO8601()` validator to reject it as a 400. Calling
 * `normalizeToMonthStart` directly from a transform would instead throw inside
 * the ValidationPipe, escaping as an unhandled 500 on plain bad input.
 * @param value The raw, unvalidated value from the request body or query
 * @returns The normalized month start, or the original value if unparseable
 */
export const normalizeToMonthStartForTransform = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  try {
    return normalizeToMonthStart(value);
  } catch {
    return value;
  }
};

/**
 * Normalizes the given date to the UTC start of its own day, preserving the
 * day of the month.
 *
 * Use this for dates that identify a specific day (e.g. the day money moved),
 * as opposed to `normalizeToMonthStart`, which collapses a date to the month
 * it belongs to.
 * @param dateStr The stringified date.
 * @returns The stringified UTC date at midnight of that same day.
 * */
export const normalizeToDayStart = (dateStr: string): string => {
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }

  const normalized = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  return normalized.toISOString();
};

/**
 * Day-start normalization for DTO `@Transform` callbacks.
 *
 * A date-only string such as `2026-09-17` is a valid ISO 8601 value and passes
 * `@IsISO8601()`, but Prisma rejects it as a DateTime ("premature end of
 * input"). Widening it to a full UTC timestamp here is what keeps the value
 * usable by the time it reaches the database.
 *
 * Returns the value untouched when it is not a parseable date, leaving the
 * field's own `@IsISO8601()` validator to reject it as a 400. Calling
 * `normalizeToDayStart` directly from a transform would instead throw inside
 * the ValidationPipe, escaping as an unhandled 500 on plain bad input.
 * @param value The raw, unvalidated value from the request body or query
 * @returns The normalized day start, or the original value if unparseable
 */
export const normalizeToDayStartForTransform = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  try {
    return normalizeToDayStart(value);
  } catch {
    return value;
  }
};
