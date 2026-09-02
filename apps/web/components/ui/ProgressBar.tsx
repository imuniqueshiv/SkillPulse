import React from 'react';

export interface ProgressBarProps {
  label?: string;
  value: number;
  maxValue?: number;
  color?: 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function ProgressBar({
  label,
  value,
  maxValue = 100,
  color = 'accent',
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / (maxValue || 1)) * 100));

  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'bg-[var(--sp-success)]';
      case 'warning':
        return 'bg-[var(--sp-warning)]';
      case 'danger':
        return 'bg-[var(--sp-danger)]';
      case 'accent':
      default:
        return 'bg-[var(--sp-accent)]';
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`.trim()}>
      {(label !== undefined || value !== undefined) && (
        <div className="flex justify-between items-center text-[0.8125rem]">
          {label && (
            <span className="text-[var(--sp-text-secondary)] font-medium">
              {label}
            </span>
          )}
          <span className="text-[var(--sp-text-tertiary)] font-mono ml-auto">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className="h-[6px] w-full bg-[var(--sp-bg-hover)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full sp-progress-animate transition-all duration-300 ${getColorClasses()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
