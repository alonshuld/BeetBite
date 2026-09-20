import { useEffect, useRef, useState } from "react";
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
        className="min-w-[120px] text-center text-sm font-medium text-text hover:text-beet transition-colors px-2 py-1 rounded border border-border hover:bg-surface-2 cursor-pointer"
      >
        {MONTH_NAMES[lang][month]} {year}
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 bg-surface-2 border border-border rounded-md shadow-lg p-3 w-[220px]">
          <select
            value={year}
            onChange={(e) => selectYear(Number(e.target.value))}
            className="w-full mb-3 px-2 py-1.5 rounded bg-surface-3 border border-border text-text text-sm outline-none cursor-pointer focus:border-beet appearance-none"
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
                className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  i === month
                    ? "bg-beet text-white"
                    : "text-text hover:bg-surface-3"
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
