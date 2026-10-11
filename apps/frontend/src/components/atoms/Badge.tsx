import { HTMLAttributes } from "react";

type BadgeVariant = "green" | "red" | "yellow" | "beet" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

// No background tint on the coloured variants. They were written as
// `bg-success/12` etc., but Tailwind 3 had no /12 or /14 opacity step, so those
// classes never rendered and the badges have always shipped without a fill.
// Tailwind 4 would honour them, so they are omitted to keep the look as shipped.
const variantClasses: Record<BadgeVariant, string> = {
  green: "text-success border-(color:--badge-success-border)",
  red: "text-danger border-(color:--badge-danger-border)",
  yellow: "text-warning border-(color:--badge-warning-border)",
  beet: "text-beet-bright border-(color:--badge-beet-border)",
  muted: "bg-surface-3 text-text-muted border-border",
};

/*
 * Badges state a condition (paid, pending, done) and are read beside a figure,
 * so they stay on the small end and keep sentence case: these labels carry
 * dates and Hebrew, neither of which survives being tracked out in caps.
 */
export function Badge({
  variant = "muted",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-sm text-micro font-semibold whitespace-nowrap border ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
