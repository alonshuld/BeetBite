import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}
    >
      {icon && <div className="text-[40px] opacity-40">{icon}</div>}
      <div className="flex flex-col gap-1">
        <p className="text-text text-sm font-medium">{title}</p>
        {description && (
          <p className="text-text-muted text-xs">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
