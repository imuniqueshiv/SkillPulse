import React from 'react';

export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  rows?: T[];
  data?: T[];
  className?: string;
  /** Emphasize the first N rows (highest-ranked skills, signals, etc.). */
  highlightCount?: number;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  data,
  className = '',
  highlightCount = 0,
}: DataTableProps<T>) {
  const tableData = rows || data || [];

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
          <tr style={{ background: '#003B73' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 text-[0.75rem] font-medium text-white uppercase tracking-wider ${getAlignClass(col.align)}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--sp-border)]">
          {tableData.map((row, idx) => (
            <tr
              key={idx}
              className="transition-colors duration-150 ease-out hover:bg-[var(--sp-bg-hover)]"
              style={{
                background:
                  idx < highlightCount
                    ? 'var(--sp-accent-muted)'
                    : idx % 2 === 1
                      ? '#F8FAFC'
                      : undefined,
                fontWeight: idx < highlightCount ? 600 : undefined,
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-[0.8125rem] text-[var(--sp-text-primary)] ${getAlignClass(col.align)}`}
                >
                  {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
