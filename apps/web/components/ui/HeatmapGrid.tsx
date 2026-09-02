"use client";

import React from 'react';

export interface HeatmapGridProps {
  data: number[][]; // 2D array, values 0-100
  xLabels: string[];
  yLabels: string[];
  className?: string;
}

export function HeatmapGrid({
  data,
  xLabels,
  yLabels,
  className = '',
}: HeatmapGridProps) {
  const getCellColor = (val: number) => {
    const opacity = Math.max(0.15, val / 100);
    if (val < 40) {
      return `hsla(0, 75%, 60%, ${opacity})`; // Danger / High gap
    }
    if (val < 70) {
      return `hsla(38, 92%, 55%, ${opacity})`; // Warning / Mid gap
    }
    return `hsla(145, 65%, 50%, ${opacity})`; // Success / Low gap
  };

  return (
    <div className={`overflow-x-auto p-2 ${className}`.trim()}>
      <div className="flex flex-col gap-2 min-w-max">
        {/* Top X Labels */}
        <div className="flex items-center gap-2 pl-24">
          {xLabels.map((lbl, idx) => (
            <div
              key={idx}
              className="w-8 text-center text-[0.6875rem] font-medium text-[var(--sp-text-tertiary)] truncate"
              title={lbl}
            >
              {lbl.slice(0, 4)}
            </div>
          ))}
        </div>

        {/* Rows with Y Label */}
        {yLabels.map((yLbl, rIdx) => (
          <div key={rIdx} className="flex items-center gap-2">
            <span
              className="w-24 text-right text-[0.75rem] font-medium text-[var(--sp-text-secondary)] truncate pr-2"
              title={yLbl}
            >
              {yLbl}
            </span>
            <div className="flex items-center gap-2">
              {(data[rIdx] || []).map((val, cIdx) => (
                <div
                  key={cIdx}
                  className="sp-heatmap-cell h-8 w-8 rounded-[var(--sp-radius-sm)] flex items-center justify-center text-[0.6875rem] font-mono font-semibold text-[var(--sp-text-primary)] transition-all duration-150"
                  style={{ backgroundColor: getCellColor(val) }}
                  data-tooltip={`${yLabels[rIdx]} - ${xLabels[cIdx]}: ${val}%`}
                  title={`${yLabels[rIdx]} - ${xLabels[cIdx]}: ${val}%`}
                >
                  {val}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
