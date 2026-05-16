import { HTMLAttributes } from "react";

interface FormGroupProps extends HTMLAttributes<HTMLDivElement> {}

export function FormGroup({ className = "", ...props }: FormGroupProps) {
  return <div className={`mb-4 ${className}`} {...props} />;
}

interface FormRowProps extends HTMLAttributes<HTMLDivElement> {}

export function FormRow({ className = "", ...props }: FormRowProps) {
  return (
    <div
      className={`grid grid-cols-2 gap-4 max-[768px]:grid-cols-1 ${className}`}
      {...props}
    />
  );
}
