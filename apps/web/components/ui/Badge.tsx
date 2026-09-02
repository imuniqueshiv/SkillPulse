import React from 'react';

export interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'neutral' | 'accent';
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant,
  children,
  className = '',
}: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'text-[var(--sp-success)] bg-[var(--sp-success-muted)]';
      case 'warning':
        return 'text-[var(--sp-warning)] bg-[var(--sp-warning-muted)]';
      case 'danger':
        return 'text-[var(--sp-danger)] bg-[var(--sp-danger-muted)]';
      case 'accent':
        return 'text-[var(--sp-accent-text)] bg-[var(--sp-accent-muted)]';
      case 'neutral':
      default:
        return 'text-[var(--sp-text-secondary)] bg-[var(--sp-bg-hover)]';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium transition-colors duration-150 ${getVariantStyles()} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
