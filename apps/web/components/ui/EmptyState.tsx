import React from 'react';
import Link from 'next/link';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  className = '',
}: EmptyStateProps) {
  const renderAction = () => {
    if (!actionLabel) return null;

    const buttonClasses =
      'inline-flex items-center gap-2 rounded-[var(--sp-radius-md)] bg-[var(--sp-accent)] px-5 py-2 text-[0.8125rem] font-medium text-white transition-all duration-150 ease-out hover:bg-[var(--sp-accent-hover)] cursor-pointer';

    if (actionHref) {
      return (
        <Link href={actionHref} className={buttonClasses}>
          {actionLabel}
        </Link>
      );
    }

    return (
      <button type="button" className={buttonClasses}>
        {actionLabel}
      </button>
    );
  };

  return (
    <div
      className={`mx-auto flex max-w-[400px] flex-col items-center px-5 py-[60px] text-center ${className}`.trim()}
    >
      <div className="sp-fade-in mb-5 flex h-[64px] w-[64px] items-center justify-center rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-bg-elevated)] text-[var(--sp-text-secondary)] [&>svg]:h-[28px] [&>svg]:w-[28px]">
        {icon}
      </div>

      <h3 className="mb-2 text-[1.125rem] font-semibold text-[var(--sp-text-primary)]">
        {title}
      </h3>

      <p className="mb-6 text-[0.875rem] leading-[1.5] text-[var(--sp-text-secondary)]">
        {description}
      </p>

      {renderAction()}
    </div>
  );
}
