import { InputHTMLAttributes, forwardRef } from "react";
import { Icon } from "@/components/atoms/Icon";

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      // Full width on a phone so it lines up with the content below; a
      // comfortable fixed width from the small breakpoint up.
      <div className={`relative w-full sm:max-w-xs ${className}`}>
        <span className="pointer-events-none absolute inset-y-0 inset-s-3 flex items-center text-text-dim">
          <Icon name="search" size={16} />
        </span>
        <input
          ref={ref}
          type="search"
          className="w-full rounded-sm border border-border bg-surface py-2 pe-3 ps-9 text-sm text-text outline-hidden transition-[border-color,box-shadow] duration-150 placeholder:text-text-dim hover:border-border-strong focus:border-beet focus:shadow-[0_0_0_3px_var(--beet-glow)] [&::-webkit-search-cancel-button]:cursor-pointer"
          {...props}
        />
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
