import { ReactNode, useEffect } from "react";
import {
  ButtonGhost,
  ButtonDanger,
  ButtonPrimary,
  Icon,
} from "@/components/atoms";
import { useLang } from "@/contexts/useLang";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  large?: boolean;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  large = false,
  footer,
}: ModalProps) {
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
      className="fixed inset-0 z-50 flex items-end justify-center animate-fadeIn bg-[oklch(12%_0.03_350_/_0.6)] backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92vh] w-full animate-sheetIn flex-col overflow-hidden border border-border bg-surface shadow-modal rounded-t-lg sm:rounded-lg ${
          large ? "sm:max-w-[760px]" : "sm:max-w-[540px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
            <h2 className="text-title text-text">{title}</h2>
            <button
              onClick={onClose}
              className="-me-1.5 rounded p-1.5 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="Close"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-surface-2 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
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

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  message,
  title,
  loading,
}: ConfirmModalProps) {
  const { t } = useLang();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <ButtonGhost onClick={onClose} disabled={loading}>
            {t("cancel")}
          </ButtonGhost>
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

export function FormModal({
  open,
  onClose,
  onSubmit,
  title,
  children,
  loading,
  large,
}: FormModalProps) {
  const { t } = useLang();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      large={large}
      footer={
        <>
          <ButtonGhost onClick={onClose} disabled={loading}>
            {t("cancel")}
          </ButtonGhost>
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
