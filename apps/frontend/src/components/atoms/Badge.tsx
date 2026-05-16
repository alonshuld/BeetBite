import { HTMLAttributes } from "react";

type BadgeVariant = "green" | "red" | "yellow" | "beet" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: "bg-success/15 text-success border-success/30",
  red: "bg-danger/15 text-danger border-danger/30",
  yellow: "bg-warning/15 text-warning border-warning/30",
  beet: "bg-beet/15 text-beet-bright border-beet/30",
  muted: "bg-surface-3 text-text-muted border-border",
};

export function Badge({ variant = "muted", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
