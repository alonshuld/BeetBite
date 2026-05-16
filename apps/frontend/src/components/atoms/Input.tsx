import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={id}
            className="text-[12px] font-medium uppercase tracking-wide text-text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full px-3 py-2 rounded-sm bg-surface-3 border border-border text-text text-sm outline-none transition-shadow placeholder:text-text-dim focus:border-beet focus:shadow-[0_0_0_3px_var(--beet-glow)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
