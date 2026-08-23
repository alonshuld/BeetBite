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
