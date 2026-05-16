import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success:
    "border-l-4 border-[var(--success)] bg-[var(--surface3)] text-[var(--success)]",
  error:
    "border-l-4 border-[var(--danger)] bg-[var(--surface3)] text-[var(--danger)]",
  info: "border-l-4 border-[var(--border)] bg-[var(--surface3)] text-[var(--text-muted)]",
};

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
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
      const timer = setTimeout(() => dismiss(id), 3000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-[640px]:bottom-4 max-[640px]:right-2 max-[640px]:left-2"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] shadow-lg text-sm min-w-[240px] max-w-[360px] animate-[fadeInUp_0.15s_ease] ${VARIANT_CLASSES[t.variant]}`}
            >
              <span className="shrink-0 text-base leading-none font-bold">
                {VARIANT_ICON[t.variant]}
              </span>
              <span className="flex-1 text-[var(--text)]">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-sm leading-none"
                aria-label="Dismiss"
              >
                ✕
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
