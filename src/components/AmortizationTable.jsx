import { useState, useMemo } from 'react';

/**
 * AmortizationTable — Scrollable table of monthly/yearly amortization data.
 *
 * Features sticky header, monthly/yearly toggle, and alternating row colors.
 */
export default function AmortizationTable({ schedule }) {
  const [viewMode, setViewMode] = useState('monthly');

  const data = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];
    if (viewMode === 'monthly') return schedule;

    // Aggregate into yearly
    const yearly = [];
    let current = null;
    for (const row of schedule) {
      if (!current || current.year !== row.year) {
        if (current) yearly.push(current);
        current = {
          year: row.year,
          opening: row.opening,
          closing: row.closing,
          emi: 0,
          principalComponent: 0,
          interestComponent: 0,
          months: 0,
        };
      }
      current.emi += row.emi;
      current.principalComponent += row.principalComponent;
      current.interestComponent += row.interestComponent;
      current.closing = row.closing;
      current.months += 1;
    }
    if (current) yearly.push(current);
    return yearly.map((y) => ({
      ...y,
      emi: Math.round(y.emi * 100) / 100,
      principalComponent: Math.round(y.principalComponent * 100) / 100,
      interestComponent: Math.round(y.interestComponent * 100) / 100,
    }));
  }, [schedule, viewMode]);

  if (!data.length) {
    return (
      <div className="text-center py-8 text-ink-muted">
        No amortization data available
      </div>
    );
  }

  const fmt = (v) =>
    '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const columns =
    viewMode === 'monthly'
      ? [
          { key: 'month', label: 'Month', align: 'left' },
          { key: 'opening', label: 'Opening', align: 'right' },
          { key: 'emi', label: 'EMI', align: 'right' },
          { key: 'principalComponent', label: 'Principal', align: 'right' },
          { key: 'interestComponent', label: 'Interest', align: 'right' },
          { key: 'closing', label: 'Closing', align: 'right' },
        ]
      : [
          { key: 'year', label: 'Year', align: 'left' },
          { key: 'opening', label: 'Opening', align: 'right' },
          { key: 'emi', label: 'Total EMI', align: 'right' },
          { key: 'principalComponent', label: 'Principal', align: 'right' },
          { key: 'interestComponent', label: 'Interest', align: 'right' },
          { key: 'closing', label: 'Closing', align: 'right' },
        ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider">
          Amortization Schedule
        </h3>
        <div className="flex items-center gap-1 bg-surface-cool rounded-lg p-1">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
            aria-pressed={viewMode === 'monthly'}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'yearly'
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
            aria-pressed={viewMode === 'yearly'}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-96 rounded-xl border border-gray-200 scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-cool">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium text-ink-muted text-xs uppercase tracking-wider ${
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
                className={`border-t border-gray-100 transition-colors hover:bg-surface-cool/50 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 font-mono text-xs ${
                      col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                    } ${col.key === (viewMode === 'monthly' ? 'month' : 'year') ? 'font-medium' : ''}`}
                  >
                    {col.key === 'emi' || col.key === 'opening' || col.key === 'closing' || col.key === 'principalComponent' || col.key === 'interestComponent'
                      ? fmt(row[col.key])
                      : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
