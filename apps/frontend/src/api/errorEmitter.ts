type ErrorListener = (message: string) => void;
let listener: ErrorListener | null = null;
export const setErrorListener = (fn: ErrorListener | null): void => {
  listener = fn;
};
export const emitApiError = (message: string): void => {
  listener?.(message);
};
