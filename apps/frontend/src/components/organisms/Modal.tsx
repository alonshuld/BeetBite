import { ReactNode, useEffect } from "react";
import { ButtonGhost, ButtonDanger, ButtonPrimary } from "@/components/atoms";
import { useLang } from "@/contexts/LangContext";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  large?: boolean;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, large = false, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ backgroundColor: "oklch(5% 0.01 350 / 0.75)" }}
      onClick={onClose}
    >
      <div
        className={`bg-surface rounded-[var(--radius)] w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden animate-[slideUp_0.2s_ease] sm:rounded-[var(--radius)] sm:rounded-b-[var(--radius)] max-[640px]:rounded-b-none ${large ? "sm:max-w-[720px]" : "sm:max-w-[520px]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border shrink-0">
            <h2 className="font-serif text-xl text-text">{title}</h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text text-lg leading-none p-1 -mr-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 pb-5 pt-3 border-t border-border shrink-0 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  title?: string;
  loading?: boolean;
}

export function ConfirmModal({ open, onClose, onConfirm, message, title, loading }: ConfirmModalProps) {
  const { t } = useLang();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <ButtonGhost onClick={onClose} disabled={loading}>{t("cancel")}</ButtonGhost>
          <ButtonDanger onClick={onConfirm} disabled={loading}>
            {loading ? "…" : t("delete")}
          </ButtonDanger>
        </>
      }
    >
      <p className="text-text text-sm">{message}</p>
    </Modal>
  );
}

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  children: ReactNode;
  loading?: boolean;
  large?: boolean;
}

export function FormModal({ open, onClose, onSubmit, title, children, loading, large }: FormModalProps) {
  const { t } = useLang();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      large={large}
      footer={
        <>
          <ButtonGhost onClick={onClose} disabled={loading}>{t("cancel")}</ButtonGhost>
          <ButtonPrimary onClick={onSubmit} disabled={loading}>
            {loading ? "…" : t("save")}
          </ButtonPrimary>
        </>
      }
    >
      {children}
    </Modal>
  );
}
