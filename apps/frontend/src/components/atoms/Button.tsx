import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export function ButtonPrimary({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-[18px] py-[9px] rounded bg-beet text-white text-sm font-medium transition-all hover:bg-beet-bright active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

export function ButtonGhost({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-[18px] py-[9px] rounded bg-transparent text-text-muted border border-border text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

export function ButtonDanger({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-[18px] py-[9px] rounded bg-transparent text-danger border border-danger text-sm font-medium transition-colors hover:bg-danger/10 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

export function ButtonIcon({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center w-8 h-8 rounded border border-border text-text-muted transition-colors hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

export function LinkButton({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1 bg-transparent border-none text-beet-bright text-sm font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer p-0 ${className}`}
      {...props}
    />
  );
}
