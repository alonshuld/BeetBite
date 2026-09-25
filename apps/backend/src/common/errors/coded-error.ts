/**
 * Values interpolated into a translated error message on the client.
 */
export type ErrorParams = Record<string, string | number>;

/**
 * An error that carries a stable, machine-readable `code` alongside its
 * English message. `EntityExceptionFilter` copies `code` and `params` into the
 * response body so the frontend can show the error in the user's language —
 * the English `message` stays the fallback. Codes are part of the API
 * contract: the frontend's `apiErrorMessages` must have an entry for each.
 */
export interface CodedError {
  readonly code: string;
  readonly params?: ErrorParams;
}

export function isCodedError(value: unknown): value is CodedError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { code?: unknown }).code === 'string'
  );
}
