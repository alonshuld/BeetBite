import { HTMLAttributes, ReactNode } from "react";

/*
 * The money screens all show the same shape: a column of labelled figures
 * whose rules carry the arithmetic —
 *
 *   a faint rule closes a subtotal,
 *   a darker rule closes the figure everything else was working towards.
 *
 * Weight rather than count does the work: a true double rule is the printed
 * convention, but at screen sizes it reads as a border drawn twice by mistake.
 * The amounts sit on one axis down the sheet with tabular figures keeping the
 * digits aligned.
 */

type Tone = "default" | "positive" | "deduction" | "total" | "muted";

const toneAmount: Record<Tone, string> = {
  default: "text-text font-semibold",
  positive: "text-success font-semibold",
  // A supplier's cut is not a warning, it is simply money leaving. It reads as
  // ordinary ink and the minus sign does the talking.
  deduction: "text-text-muted font-medium",
  total: "text-text font-bold",
  muted: "text-text-dim font-medium",
};

const toneLabel: Record<Tone, string> = {
  default: "text-text-muted",
  positive: "text-text-muted",
  deduction: "text-text-muted",
  total: "text-text font-semibold",
  muted: "text-text-dim",
};

export function Statement({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`tnum flex flex-col ${className}`} {...props} />;
}

interface StatementRowProps {
  /** Left-hand description. Accepts a node so a row can stay interactive. */
  label: ReactNode;
  /** Sits beside the label — a badge, a date, a status. */
  meta?: ReactNode;
  amount: ReactNode;
  tone?: Tone;
  /** Larger type for the row a sheet is read for. */
  emphasis?: boolean;
  className?: string;
}

export function StatementRow({
  label,
  meta,
  amount,
  tone = "default",
  emphasis = false,
  className = "",
}: StatementRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-[5px] ${
        emphasis ? "text-lead" : "text-sm"
      } ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`truncate ${toneLabel[tone]}`}>{label}</span>
        {meta}
      </div>
      <span dir="ltr" className={`shrink-0 text-end ${toneAmount[tone]}`}>
        {amount}
      </span>
    </div>
  );
}

/** Single rule: the figure below it is a subtotal. */
export function StatementRule({ className = "" }: { className?: string }) {
  return (
    <div className={`my-1 h-px bg-border ${className}`} aria-hidden="true" />
  );
}

/** Closing rule: the figure below it is what the sheet was computing. */
export function StatementTotalRule({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mb-1 mt-2 h-px bg-text-muted ${className}`}
      aria-hidden="true"
    />
  );
}
