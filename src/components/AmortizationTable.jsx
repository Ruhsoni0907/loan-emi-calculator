import { useState, useMemo } from 'react';
import { exportScheduleCSV, formatINR, aggregateYearly } from '../lib/emiEngine.js';

/**
 * AmortizationTable — Polished, scrollable table with monthly/yearly toggle and CSV export.
 */
export default function AmortizationTable({ schedule }) {
  const [viewMode, setViewMode] = useState('yearly');

  const data = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];
    if (viewMode === 'monthly') return schedule;
    return aggregateYearly(schedule) || [];
  }, [schedule, viewMode]);

  if (!data.length) {
    return (
      <div className="text-center py-12 text-ink-muted">
        <p>No schedule data</p>
      </div>
    );
  }

  const handleExport = () => {
    const exportData = viewMode === 'yearly'
      ? data.map((y) => ({
          month: `${y.year}`,
          year: y.year,
          opening: y.opening,
          emi: y.emi,
          principalComponent: y.principalComponent,
          interestComponent: y.interestComponent,
          closing: y.closing,
        }))
      : schedule;
    exportScheduleCSV(exportData);
  };

  const columns =
    viewMode === 'monthly'
      ? [
          { key: 'month', label: 'Month', align: 'left', mono: true },
          { key: 'opening', label: 'Opening', align: 'right', mono: true },
          { key: 'emi', label: 'EMI', align: 'right', mono: true, highlight: true },
          { key: 'principalComponent', label: 'Principal', align: 'right', mono: true, color: 'primary' },
          { key: 'interestComponent', label: 'Interest', align: 'right', mono: true, color: 'accent' },
          { key: 'closing', label: 'Closing', align: 'right', mono: true },
        ]
      : [
          { key: 'year', label: 'Year', align: 'left', mono: true },
          { key: 'opening', label: 'Opening', align: 'right', mono: true },
          { key: 'emi', label: 'Total EMI', align: 'right', mono: true, highlight: true },
          { key: 'principalComponent', label: 'Principal', align: 'right', mono: true, color: 'primary' },
          { key: 'interestComponent', label: 'Interest', align: 'right', mono: true, color: 'accent' },
          { key: 'closing', label: 'Closing', align: 'right', mono: true },
        ];

  const formatCell = (value, col) => {
    if (col.key === 'month' || col.key === 'year') return value;
    return formatINR(value, false);
  };

  const colorMap = {
    primary: 'text-primary font-semibold',
    accent: 'text-accent-warm font-semibold',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xs font-bold text-ink-faint uppercase tracking-wider">
          Amortization Schedule
        </h3>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-surface-cool rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-faint hover:text-ink'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                viewMode === 'yearly'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-faint hover:text-ink'
              }`}
            >
              Yearly
            </button>
          </div>

          {/* CSV export */}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-lg text-[10px] font-semibold text-ink-muted hover:text-ink hover:border-ink-faint transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[480px] rounded-xl border border-border scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-cool border-b border-border">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[10px] font-bold text-ink-faint uppercase tracking-wider ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.year || row.month}
                className={`border-b border-border/50 transition-colors hover:bg-accent/3 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-surface-cool/50'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 text-xs ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${
                      col.mono ? 'font-mono tabular-nums' : ''
                    } ${
                      col.highlight ? 'font-bold text-ink' : ''
                    } ${
                      col.color ? colorMap[col.color] : 'text-ink'
                    }`}
                  >
                    {formatCell(row[col.key], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-ink-faint mt-3 text-right">
        Showing {data.length} {viewMode === 'monthly' ? 'months' : 'years'}
        {' • '}
        <button onClick={handleExport} className="text-accent hover:underline cursor-pointer font-medium">
          Download full schedule
        </button>
      </p>
    </div>
  );
}
