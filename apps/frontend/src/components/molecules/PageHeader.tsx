import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

/*
 * The rule under the header is the only divider on most screens: it separates
 * the page's chrome from its content, so everything below can sit on open
 * paper without needing a box drawn round it.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex items-end justify-between gap-4 border-b border-border pb-4 max-[768px]:flex-col max-[768px]:items-stretch ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-page text-text">{title}</h1>
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
