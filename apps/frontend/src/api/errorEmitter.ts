import type { ApiError } from "@/api/apiErrors";

type ErrorListener = (error: ApiError) => void;
let listener: ErrorListener | null = null;
export const setErrorListener = (fn: ErrorListener | null): void => {
  listener = fn;
};
export const emitApiError = (error: ApiError): void => {
  listener?.(error);
};
