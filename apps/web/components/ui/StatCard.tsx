"use client";

import React from 'react';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  trend,
  trendDirection = 'neutral',
  icon,
  className = '',
}: StatCardProps) {
  const getTrendClasses = () => {
    switch (trendDirection) {
      case 'up':
        return 'text-[var(--sp-success)] bg-[var(--sp-success-muted)]';
      case 'down':
        return 'text-[var(--sp-danger)] bg-[var(--sp-danger-muted)]';
      case 'neutral':
      default:
        return 'text-[var(--sp-text-secondary)] bg-[var(--sp-bg-hover)]';
    }
  };

  const getTrendArrow = () => {
    switch (trendDirection) {
      case 'up':
        return '▲ ';
      case 'down':
        return '▼ ';
      case 'neutral':
      default:
        return '';
    }
  };

  return (
    <Card
      className={`transition-all duration-150 ease-out hover:border-[var(--sp-border-strong)] ${className}`.trim()}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sp-accent-muted)] text-[var(--sp-accent)]">
          {icon}
        </div>
        {trend && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.75rem] font-medium ${getTrendClasses()}`}
          >
            {getTrendArrow()}
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[0.8125rem] text-[var(--sp-text-secondary)]">
          {label}
        </p>
        <p className="mt-1 text-[1.75rem] font-bold tracking-tight text-[var(--sp-text-primary)]">
          {value}
        </p>
      </div>
    </Card>
  );
}
