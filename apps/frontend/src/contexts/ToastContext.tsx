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
 * The accent is a rule on the reading edge, so it flips with the language
 * rather than always sitting on the left as it did before.
 */
const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "border-s-[3px] border-s-[var(--success)] text-[var(--success)]",
  error: "border-s-[3px] border-s-[var(--danger)] text-[var(--danger)]",
  info: "border-s-[3px] border-s-[var(--border-strong)] text-[var(--text-muted)]",
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
          className="fixed bottom-4 z-[100] flex flex-col gap-2 ltr:right-4 rtl:left-4 max-[640px]:inset-x-2"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.variant === "error" ? "alert" : undefined}
              className={`flex min-w-[260px] max-w-[380px] animate-[fadeInUp_0.15s_ease] items-start gap-2.5 rounded border border-border bg-[var(--surface)] px-3.5 py-3 text-sm shadow-pop ${VARIANT_CLASSES[t.variant]}`}
            >
              <Icon
                name={VARIANT_ICON[t.variant]}
                size={16}
                className="mt-0.5"
              />
              <span className="flex-1 text-[var(--text)]">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="-me-1 shrink-0 rounded p-1 text-[var(--text-dim)] transition-colors hover:text-[var(--text)]"
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
