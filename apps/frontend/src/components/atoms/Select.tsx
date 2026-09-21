import { SelectHTMLAttributes, forwardRef, useId } from "react";
import { Icon } from "./Icon";
import { fieldBase, fieldLabel } from "./field";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, id, className = "", children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className={fieldLabel}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`${fieldBase} pe-9 appearance-none cursor-pointer ${className}`}
            {...props}
          >
            {children}
          </select>
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-text-dim">
            <Icon name="chevronDown" size={14} />
          </span>
        </div>
      </div>
    );
  },
);
Select.displayName = "Select";
