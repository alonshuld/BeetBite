import { createContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
