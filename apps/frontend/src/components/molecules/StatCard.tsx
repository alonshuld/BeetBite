import { HTMLAttributes } from "react";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  sub?: string;
}

export function StatCard({
  label,
  value,
  sub,
  className = "",
  ...props
}: StatCardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded p-4 flex flex-col gap-1 ${className}`}
      {...props}
    >
      <span className="text-[11px] uppercase tracking-wide text-text-dim font-medium">
        {label}
      </span>
      <span className="text-[26px] font-bold text-text leading-none">
        {value}
      </span>
      {sub && <span className="text-[12px] text-text-muted">{sub}</span>}
    </div>
  );
}
