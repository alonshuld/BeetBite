import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, id, className = "", children, ...props }, ref) => {
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
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={`w-full px-3 py-2 ltr:pr-8 rtl:pl-8 rounded-sm bg-surface-3 border border-border text-text text-sm outline-none transition-shadow appearance-none cursor-pointer focus:border-beet focus:shadow-[0_0_0_3px_var(--beet-glow)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          >
            {children}
          </select>
          <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center text-text-muted">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    );
  },
);
Select.displayName = "Select";
