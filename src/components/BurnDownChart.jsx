import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatINR } from '../lib/emiEngine.js';

/**
 * BurnDownChart — Polished area chart showing balance and cumulative interest.
 */
export default function BurnDownChart({ schedule }) {
  const [chartType, setChartType] = useState('combined'); // 'combined' | 'principal' | 'interest'

  const chartData = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];

    // Sample for readability on long schedules
    const sampleRate = schedule.length > 36 ? 6 : schedule.length > 12 ? 3 : 1;
    const sampled = schedule.filter(
      (row) => row.month === 1 || row.month === schedule.length || row.month % sampleRate === 0
    );

    let cumInterest = 0;
    let cumPrincipal = 0;

    return sampled.map((row) => {
      cumInterest += row.interestComponent;
      cumPrincipal += row.principalComponent;
      return {
        label: row.month,
        month: row.month,
        balance: row.closing,
        cumInterest: Math.round(cumInterest * 100) / 100,
        cumPrincipal: Math.round(cumPrincipal * 100) / 100,
        interestPaid: Math.round(cumInterest * 100) / 100,
      };
    });
  }, [schedule]);

  if (!chartData.length) return null;

  const totalMonths = schedule.length;
  const years = Math.floor(totalMonths / 12);

  const formatYAxis = (v) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(0)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    return (
      <div className="bg-white border border-border rounded-xl shadow-xl p-4 text-sm min-w-[180px]">
        <p className="font-bold text-ink mb-2">
          Month {data?.month} <span className="text-ink-faint font-normal">(~Year {Math.ceil(data?.month / 12)})</span>
        </p>
        <div className="space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="font-mono text-xs font-semibold text-ink">
                {formatINR(entry.value, true)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-ink-faint uppercase tracking-wider">
          Loan Amortization Chart
        </h3>
        <div className="flex items-center gap-1 bg-surface-cool rounded-lg p-0.5 border border-border">
          {[
            { id: 'combined', label: 'Overview' },
            { id: 'principal', label: 'Principal' },
            { id: 'interest', label: 'Interest' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setChartType(id)}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                chartType === id
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-faint hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A2540" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#0A2540" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#FF6B35" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradPrincipal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00D4AA" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#90A4AE', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#E3E8EE' }}
              tickFormatter={(v) => years > 5 ? `Y${Math.ceil(v / 12)}` : `M${v}`}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 10, fill: '#90A4AE', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />

            {(chartType === 'combined' || chartType === 'principal') && (
              <Area
                type="monotone"
                dataKey="balance"
                name="Outstanding"
                stroke="#0A2540"
                strokeWidth={2.5}
                fill="url(#gradBalance)"
                dot={false}
                animationDuration={1000}
              />
            )}

            {(chartType === 'combined' || chartType === 'interest') && (
              <Area
                type="monotone"
                dataKey="interestPaid"
                name="Cum. Interest"
                stroke="#FF6B35"
                strokeWidth={2.5}
                fill="url(#gradInterest)"
                dot={false}
                animationDuration={1000}
              />
            )}

            {chartType === 'principal' && (
              <Area
                type="monotone"
                dataKey="cumPrincipal"
                name="Cum. Principal"
                stroke="#00D4AA"
                strokeWidth={2.5}
                fill="url(#gradPrincipal)"
                dot={false}
                animationDuration={1000}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
