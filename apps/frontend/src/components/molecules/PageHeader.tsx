import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className = "" }: PageHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between gap-3 max-[768px]:flex-col ${className}`}
    >
      <div className="flex flex-col gap-0.5">
        <h1 className="font-serif text-[26px] text-text">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
