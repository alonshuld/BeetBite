import { useId, useState } from "react";
import { fieldBase, fieldLabel } from "@/components/atoms/field";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

interface ColorFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

/*
 * A native color swatch paired with a hex text box. The text box keeps its own
 * draft so a half-typed "#1f2" doesn't get pushed up — only a complete #rrggbb
 * (the only shape the backend accepts) reaches onChange.
 */
export function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Follow outside changes (the swatch, or the page seeding loaded settings).
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  function handleDraftChange(next: string) {
    setDraft(next);
    if (HEX_COLOR.test(next)) onChange(next.toLowerCase());
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={fieldLabel}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-sm border border-border bg-surface p-0.5"
        />
        <input
          id={inputId}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value.trim())}
          onBlur={() => setDraft(value)}
          maxLength={7}
          spellCheck={false}
          dir="ltr"
          className={`${fieldBase} font-mono`}
        />
      </div>
    </div>
  );
}
