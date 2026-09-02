"use client";

import React from 'react';

export interface ChartBarData {
  label: string;
  value: number;
  color?: string;
}

export interface ChartBarProps {
  data: ChartBarData[];
  height?: number;
  className?: string;
}

export function ChartBar({
  data,
  height = 200,
  className = '',
}: ChartBarProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-[var(--sp-radius-lg)] border border-[var(--sp-border)] text-[0.8125rem] text-[var(--sp-text-secondary)] ${className}`.trim()}
        style={{ height: `${height}px` }}
      >
        No chart data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className={`flex flex-row items-end gap-3 w-full overflow-x-auto p-2 ${className}`.trim()}
      style={{ height: `${height}px` }}
    >
      {data.map((item, index) => {
        const percentage = Math.max(2, Math.min(100, (item.value / maxValue) * 100));

        return (
          <div
            key={`${item.label}-${index}`}
            className="flex flex-col items-center h-full justify-end flex-1 min-w-[32px] max-w-[64px]"
          >
            {/* Value on top of bar */}
            <span className="text-[0.6875rem] text-[var(--sp-text-secondary)] font-mono mb-[4px] tabular-nums select-none">
              {item.value}
            </span>

            {/* Bar container */}
            <div className="w-full flex-1 flex items-end justify-center min-h-0">
              <div
                className="w-8 max-w-full rounded-t-[4px] bg-[var(--sp-accent)] sp-bar-animate"
                style={{
                  height: `${percentage}%`,
                  backgroundColor: item.color || undefined,
                  animationDelay: `${index * 80}ms`,
                }}
              />
            </div>

            {/* Label below bar */}
            <span
              className="text-[0.6875rem] text-[var(--sp-text-tertiary)] mt-[6px] text-center max-w-[48px] truncate select-none"
              title={item.label}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
