import { TextareaHTMLAttributes, forwardRef, useId } from "react";
import { fieldBase, fieldLabel } from "./field";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className={fieldLabel}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`${fieldBase} resize-y leading-relaxed ${className}`}
          {...props}
        />
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
