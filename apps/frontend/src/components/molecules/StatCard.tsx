import { HTMLAttributes } from "react";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  sub?: string;
  /** "positive" tints the figure alone, not its label. */
  tone?: "default" | "positive";
}

/*
 * A stat is a figure with a name, so the figure leads and the name sits under
 * it. Tabular numerals keep a row of these aligned on the same digit rails
 * even when the amounts differ in length.
 */
export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  className = "",
  ...props
}: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 ${className}`}
      {...props}
    >
      <span
        className={`tnum text-hero font-semibold leading-none ${
          tone === "positive" ? "text-success" : "text-text"
        }`}
      >
        {value}
      </span>
      <span className="text-sm font-medium text-text-muted">{label}</span>
      {sub && <span className="text-label text-text-dim">{sub}</span>}
    </div>
  );
}
