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
