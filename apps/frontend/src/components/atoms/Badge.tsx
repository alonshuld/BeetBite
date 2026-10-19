import { HTMLAttributes } from "react";

type BadgeVariant = "green" | "red" | "yellow" | "beet" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

// Soft pills: a faint wash of the state's colour behind its ink, so a column
// of statuses reads by colour before the words are read.
const variantClasses: Record<BadgeVariant, string> = {
  green: "bg-success/10 text-success border-(color:--badge-success-border)",
  red: "bg-danger/10 text-danger border-(color:--badge-danger-border)",
  yellow: "bg-warning/12 text-warning border-(color:--badge-warning-border)",
  beet: "bg-beet-tint text-beet border-(color:--badge-beet-border)",
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
      className={`inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-micro font-semibold whitespace-nowrap border ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
