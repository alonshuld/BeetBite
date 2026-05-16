import { ButtonIcon } from "@/components/atoms";

interface MonthPickerProps {
  value: string;
  onChange: (ym: string) => void;
  className?: string;
}

const MONTH_NAMES = [
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
];

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
  const { year, month } = parseYM(value);

  function prev() {
    if (month === 0) onChange(formatYM(year - 1, 11));
    else onChange(formatYM(year, month - 1));
  }

  function next() {
    if (month === 11) onChange(formatYM(year + 1, 0));
    else onChange(formatYM(year, month + 1));
  }

  return (
    <div
      className={`flex items-center gap-1 rtl:flex-row-reverse ${className}`}
    >
      <ButtonIcon
        onClick={prev}
        aria-label="Previous month"
        style={{ width: 30, height: 30 }}
      >
        ‹
      </ButtonIcon>
      <span className="min-w-[120px] text-center text-sm font-medium text-text">
        {MONTH_NAMES[month]} {year}
      </span>
      <ButtonIcon
        onClick={next}
        aria-label="Next month"
        style={{ width: 30, height: 30 }}
      >
        ›
      </ButtonIcon>
    </div>
  );
}
