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
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}
    >
      <div className="relative">
        <input type="checkbox" id={id} className="sr-only peer" {...props} />
        <div className="w-[38px] h-[22px] rounded-full bg-surface-3 border border-border transition-colors peer-checked:bg-beet peer-checked:border-beet" />
        <div className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-text-muted transition-transform peer-checked:translate-x-4 peer-checked:bg-white" />
      </div>
      {label && <span className="text-sm text-text">{label}</span>}
    </label>
  );
}
