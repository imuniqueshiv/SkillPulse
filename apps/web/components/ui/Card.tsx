import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  noPadding = false,
}: CardProps) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <div
      className={`rounded-[var(--sp-radius-lg)] border border-[var(--sp-border)] bg-[var(--sp-bg-elevated)] shadow-[var(--sp-shadow-sm)] overflow-hidden ${className}`.trim()}
    >
      {hasHeader && (
        <div className="flex items-center justify-between border-b border-[var(--sp-border)] px-5 py-4">
          <div>
            {title && (
              <h3 className="text-[0.875rem] font-semibold text-[var(--sp-text-primary)] leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[0.75rem] text-[var(--sp-text-secondary)]">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}
