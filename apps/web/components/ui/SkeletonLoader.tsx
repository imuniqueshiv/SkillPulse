import React from 'react';

export interface SkeletonLoaderProps {
  variant: 'card' | 'stat' | 'table-row' | 'text' | 'chart';
  count?: number;
  className?: string;
}

export function SkeletonLoader({
  variant,
  count = 1,
  className = '',
}: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  switch (variant) {
    case 'stat':
      return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 ${className}`.trim()}>
          {items.map((_, i) => (
            <div key={i} className="sp-skeleton h-[120px] w-full" />
          ))}
        </div>
      );

    case 'table-row':
      return (
        <div className={`flex flex-col gap-1 w-full ${className}`.trim()}>
          {items.map((_, i) => (
            <div key={i} className="sp-skeleton h-[48px] w-full" />
          ))}
        </div>
      );

    case 'text':
      return (
        <div className={`flex flex-col gap-2 w-full ${className}`.trim()}>
          <div className="sp-skeleton h-4 w-full" />
          <div className="sp-skeleton h-4 w-[75%]" />
          <div className="sp-skeleton h-4 w-[50%]" />
        </div>
      );

    case 'chart':
      return (
        <div className={`sp-skeleton h-[200px] w-full ${className}`.trim()} />
      );

    case 'card':
    default:
      return (
        <div className={`flex flex-col gap-4 ${className}`.trim()}>
          {items.map((_, i) => (
            <div key={i} className="sp-skeleton h-[200px] w-full" />
          ))}
        </div>
      );
  }
}
