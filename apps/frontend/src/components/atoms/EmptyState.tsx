import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/*
 * An empty screen is an invitation, so the icon is drawn quietly and the
 * action sits directly under the sentence that explains what to do.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-surface/70 px-6 py-16 text-center ${className}`}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-beet-tint text-beet">
          {icon}
        </div>
      )}
      <div className="flex max-w-[42ch] flex-col gap-1">
        <p className="text-lead font-semibold text-text">{title}</p>
        {description && (
          <p className="text-sm text-text-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
