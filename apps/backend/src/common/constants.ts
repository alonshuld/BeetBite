export const PRISMA_ERROR_CODES = {
  UNIQUE_CONSTRAINT_FAILED: 'P2002',
  FOREIGN_KEY_CONSTRAINT_FAILED: 'P2003',
  NOT_FOUND: 'P2025',
};

export const PAGINATION_DEFAULTS = {
  LIMIT: 10,
  PAGE: 1,
};

/**
 * Tag written on the income entry of a back-dated opening-balance report, so
 * the synthetic origin of the row is visible to whoever reads it later. Stored
 * verbatim; the frontend translates this exact value for display.
 */
export const OPENING_BALANCE_TAG = 'Opening balance';
