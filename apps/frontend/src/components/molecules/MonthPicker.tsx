import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/atoms/Icon";
import { useLang } from "@/contexts/useLang";

interface MonthPickerProps {
  value: string;
  onChange: (ym: string) => void;
  className?: string;
}

const MONTH_NAMES: Record<"en" | "he", string[]> = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  he: [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ],
};

const MONTH_NAMES_SHORT: Record<"en" | "he", string[]> = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  he: [
    "ינו׳",
    "פבר׳",
    "מרץ",
    "אפר׳",
    "מאי",
    "יוני",
    "יולי",
    "אוג׳",
    "ספט׳",
    "אוק׳",
    "נוב׳",
    "דצמ׳",
  ],
};

function parseYM(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m - 1 };
}

function formatYM(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function MonthPicker({
  value,
  onChange,
  className = "",
}: MonthPickerProps) {
  const { lang } = useLang();
  const { year, month } = parseYM(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function selectMonth(m: number) {
    onChange(formatYM(year, m));
    setOpen(false);
  }

  function selectYear(y: number) {
    onChange(formatYM(y, month));
  }

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-9 min-w-[150px] items-center justify-between gap-2 rounded border border-border bg-surface px-3 text-sm font-semibold text-text transition-colors duration-150 hover:border-border-strong hover:bg-surface-2"
      >
        <span className="tnum">
          {MONTH_NAMES[lang][month]} {year}
        </span>
        <Icon
          name="chevronDown"
          size={14}
          className={`text-text-dim transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full z-50 mt-1.5 w-[248px] animate-fadeIn rounded-lg border border-border bg-surface p-3 shadow-pop ltr:left-0 rtl:right-0">
          <select
            value={year}
            onChange={(e) => selectYear(Number(e.target.value))}
            aria-label={MONTH_NAMES[lang][month]}
            className="tnum mb-2.5 w-full cursor-pointer appearance-none rounded-sm border border-border bg-surface-2 px-2.5 py-1.5 text-sm font-semibold text-text outline-none transition-colors hover:border-border-strong focus:border-beet"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-1">
            {MONTH_NAMES_SHORT[lang].map((name, i) => (
              <button
                key={i}
                onClick={() => selectMonth(i)}
                aria-current={i === month}
                className={`cursor-pointer rounded-sm py-1.5 text-label font-semibold transition-colors duration-150 ${
                  i === month
                    ? "bg-beet text-white"
                    : "text-text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
