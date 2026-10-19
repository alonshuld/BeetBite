interface LangToggleProps {
  lang: "en" | "he";
  onChange: (lang: "en" | "he") => void;
  className?: string;
}

/*
 * A segmented control rather than two buttons: the pair is one setting with
 * two states, and showing both at once means the other language is always one
 * click away instead of hidden behind a toggle's current value.
 */
export function LangToggle({
  lang,
  onChange,
  className = "",
}: LangToggleProps) {
  return (
    <div
      className={`inline-flex h-9 items-center gap-0.5 rounded-full border border-border bg-surface p-[3px] ${className}`}
      role="group"
    >
      {(["en", "he"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          className={`h-full rounded-full px-3 text-label font-semibold transition-colors duration-150 ${
            lang === l ? "bg-ink text-on-ink" : "text-text-dim hover:text-text"
          }`}
        >
          {l === "en" ? "EN" : "עב"}
        </button>
      ))}
    </div>
  );
}
