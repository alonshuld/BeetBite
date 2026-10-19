import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

/*
 * A large, heavy title on open paper. No rule underneath: the white cards
 * below already separate content from chrome, so a line would only add noise.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex items-end justify-between gap-4 pb-2 max-[768px]:flex-col max-[768px]:items-stretch ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-page font-extrabold text-text">{title}</h1>
        {subtitle && (
          <p className="max-w-[62ch] text-sm text-text-muted">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2 max-[768px]:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
