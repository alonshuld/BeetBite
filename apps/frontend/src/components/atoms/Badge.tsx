import { HTMLAttributes } from "react";

type BadgeVariant = "green" | "red" | "yellow" | "beet" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  green:
    "bg-success/12 text-success [border-color:var(--badge-success-border)]",
  red: "bg-danger/12 text-danger [border-color:var(--badge-danger-border)]",
  yellow:
    "bg-warning/14 text-warning [border-color:var(--badge-warning-border)]",
  beet: "bg-beet/12 text-beet-bright [border-color:var(--badge-beet-border)]",
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
