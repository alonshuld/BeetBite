import { InputHTMLAttributes, forwardRef, useId } from "react";
import { fieldBase, fieldLabel } from "./field";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className={fieldLabel}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${fieldBase} ${className}`}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
