import { useState, useMemo } from 'react';
import { exportCSV, formatINR } from '../lib/emiEngine.js';

/**
 * AmortizationTable — Full-featured: search, pagination, sort, export.
 */
export default function AmortizationTable({ details }) {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('month');
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('yearly');
  const perPage = 12;

  const data = useMemo(() => {
    if (!details) return [];
    return view === 'yearly' ? details.yrly || details.yearly : details.schedule;
  }, [details, view]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let d = data;
    if (search) {
      const s = search.toLowerCase();
      d = d.filter(r =>
        String(r.month || r.year).includes(s) ||
        String(r.emi).includes(s) ||
        String(r.interest).includes(s)
      );
    }
    d.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return d;
  }, [data, search, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  if (!details || !data?.length) return null;

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const columns = view === 'yearly' ? [
    { key: 'year', label: 'Year' },
    { key: 'opening', label: 'Opening' },
    { key: 'emi', label: 'Total EMI' },
    { key: 'interest', label: 'Interest' },
    { key: 'principal', label: 'Principal' },
    { key: 'closing', label: 'Closing' },
  ] : [
    { key: 'month', label: 'Month' },
    { key: 'opening', label: 'Opening' },
    { key: 'emi', label: 'EMI' },
    { key: 'interest', label: 'Interest' },
    { key: 'principalComponent', label: 'Principal' },
    { key: 'closing', label: 'Closing' },
  ];

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="opacity-30">↕</span>;
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="glass-card-static p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Amortization Schedule</h4>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
            {['yearly', 'monthly'].map(v => (
              <button key={v} onClick={() => { setView(v); setPage(1); }}
                className="px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
                style={{ background: view === v ? '#635BFF' : 'transparent', color: view === v ? 'white' : 'var(--text-secondary)' }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <input type="text" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-xs w-28" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 10, outline: 'none', color: 'var(--text)' }} />

          {/* Export */}
          <button onClick={() => exportCSV(view === 'yearly' ? details.yearly : details.schedule)}
            className="btn btn-ghost text-xs py-1.5 px-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            CSV
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[400px] rounded-xl" style={{ border: '1px solid var(--card-border)' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10" style={{ background: 'var(--input-bg)' }}>
            <tr>
              {columns.map(col => (
                <th key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none"
                  style={{ color: 'var(--text-faint)' }}>
                  {col.label} <SortIcon field={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={row.month || row.year}
                className="transition-colors"
                style={{ borderTop: '1px solid var(--card-border)', background: i % 2 === 0 ? 'transparent' : 'var(--input-bg)' }}>
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2 font-mono text-xs tabular-nums"
                    style={{ color: 'var(--text)' }}>
                    {col.key === 'month' || col.key === 'year' ? row[col.key] : formatINR(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Page {page} of {totalPages} ({filtered.length} rows)
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn btn-ghost text-xs py-1 px-2" style={{ opacity: page === 1 ? 0.4 : 1 }}>←</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn btn-ghost text-xs py-1 px-2" style={{ opacity: page === totalPages ? 0.4 : 1 }}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}
