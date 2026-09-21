import { InputHTMLAttributes } from "react";

interface ToggleProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
}

export function Toggle({ label, className = "", id, ...props }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${className}`}
    >
      <span className="relative inline-flex">
        <input type="checkbox" id={id} className="sr-only peer" {...props} />
        <span className="block w-[38px] h-[22px] rounded-full bg-surface-3 border border-border-strong transition-colors duration-150 peer-checked:bg-beet peer-checked:border-beet peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-beet" />
        <span className="pointer-events-none absolute top-[3px] start-[3px] w-4 h-4 rounded-full bg-text-dim shadow-sm transition-transform duration-150 peer-checked:bg-white ltr:peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
      </span>
      {label && <span className="text-sm text-text">{label}</span>}
    </label>
  );
}
