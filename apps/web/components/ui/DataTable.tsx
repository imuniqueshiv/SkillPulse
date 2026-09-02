import React from 'react';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps {
  columns: Column[];
  rows: Record<string, React.ReactNode>[];
  className?: string;
}

export function DataTable({
  columns,
  rows,
  className = '',
}: DataTableProps) {
  const getAlignClass = (align?: 'left' | 'right' | 'center') => {
    switch (align) {
      case 'right':
        return 'text-right';
      case 'center':
        return 'text-center';
      case 'left':
      default:
        return 'text-left';
    }
  };

  return (
    <div
      className={`w-full overflow-x-auto rounded-[var(--sp-radius-md)] border border-[var(--sp-border)] ${className}`.trim()}
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[var(--sp-bg-surface)] border-b border-[var(--sp-border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 text-[0.75rem] font-medium text-[var(--sp-text-tertiary)] uppercase tracking-wider ${getAlignClass(col.align)}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--sp-border)]">
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className="transition-colors duration-150 ease-out hover:bg-[var(--sp-bg-hover)]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-[0.8125rem] text-[var(--sp-text-primary)] ${getAlignClass(col.align)}`}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
