interface LangToggleProps {
  lang: "en" | "he";
  onChange: (lang: "en" | "he") => void;
  className?: string;
}

export function LangToggle({ lang, onChange, className = "" }: LangToggleProps) {
  return (
    <div
      className={`flex items-center bg-surface-2 border border-border rounded overflow-hidden ${className}`}
    >
      {(["en", "he"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            lang === l
              ? "bg-beet text-white"
              : "text-text-muted hover:bg-surface-3"
          }`}
        >
          {l === "en" ? "EN" : "עב"}
        </button>
      ))}
    </div>
  );
}
