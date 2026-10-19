import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/atoms/Icon";
import {
  ToastContext,
  type ToastVariant,
  type ToastContextValue,
} from "./toastContext";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

/*
 * The variant shows in the icon alone, set in a soft disc of its colour; the
 * card itself stays plain so a stack of toasts reads as one family.
 */
const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "bg-success/12 text-success",
  error: "bg-danger/10 text-danger",
  info: "bg-surface-3 text-text-muted",
};

const VARIANT_ICON: Record<ToastVariant, IconName> = {
  success: "check",
  error: "alert",
  info: "inbox",
};

/*
 * An error names what to fix — often several fields — so it stays long enough
 * to read it and then find them in the form. Confirmations only need a glance.
 */
const DURATION_MS: Record<ToastVariant, number> = {
  success: 3000,
  info: 3000,
  error: 8000,
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    (message, variant = "info") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), DURATION_MS[variant]);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-5 left-1/2 z-100 flex -translate-x-1/2 flex-col items-center gap-2 max-[640px]:top-3 max-[640px]:bottom-auto max-[640px]:w-[calc(100%-24px)]"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.variant === "error" ? "alert" : undefined}
              className="flex min-w-[260px] max-w-[400px] max-[640px]:w-full max-[640px]:max-w-none animate-[fadeInUp_0.15s_ease] items-center gap-3 rounded-[16px] border border-border bg-(--surface) py-2.5 ps-2.5 pe-3 text-sm shadow-pop"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${VARIANT_CLASSES[t.variant]}`}
              >
                <Icon name={VARIANT_ICON[t.variant]} size={16} />
              </span>
              <span className="flex-1 font-medium text-(--text)">
                {t.message}
              </span>
              <button
                onClick={() => dismiss(t.id)}
                className="-me-1 shrink-0 rounded-full p-1.5 text-(--text-dim) transition-colors hover:bg-surface-3 hover:text-(--text)"
                aria-label="Dismiss"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
      <style>{`
        @keyframes fadeInUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
