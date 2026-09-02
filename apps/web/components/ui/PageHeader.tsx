import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${className}`.trim()}
    >
      <div>
        <h1 className="text-[1.5rem] font-semibold tracking-tight text-[var(--sp-text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[0.875rem] text-[var(--sp-text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
