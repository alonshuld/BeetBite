import { InputHTMLAttributes, forwardRef } from "react";

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <div className={`relative w-full ${className}`}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none rtl:left-auto rtl:right-3">
          🔍
        </span>
        <input
          ref={ref}
          type="search"
          className="w-full pl-[34px] pr-3 py-2 rounded-sm bg-surface-3 border border-border text-text text-sm outline-none transition-shadow placeholder:text-text-dim focus:border-beet focus:shadow-[0_0_0_3px_var(--beet-glow)] rtl:pl-3 rtl:pr-[34px]"
          {...props}
        />
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
