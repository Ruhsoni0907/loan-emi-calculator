import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/**
 * BurnDownChart — Area chart showing outstanding balance and cumulative interest over time.
 *
 * Uses Recharts AreaChart with gradient fills for a polished look.
 * Data points are sampled (one per year for long tenures) to keep the chart clean.
 */
export default function BurnDownChart({ schedule, tenureMode }) {
  const chartData = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];

    // For monthly view, sample at year boundaries + final month for readability
    if (schedule.length > 24) {
      const sampled = schedule.filter(
        (row) => row.month === 1 || row.month === schedule.length
      );
      // Also include every 12th month (year-end)
      const yearEnds = schedule.filter((row) => row.month % 12 === 0 && row !== sampled[sampled.length - 1]);
      const merged = [...sampled, ...yearEnds]
        .sort((a, b) => a.month - b.month)
        .filter((row, i, arr) => i === 0 || row.month !== arr[i - 1].month);

      return merged.map((row) => ({
        label: `Yr ${row.year}`,
        balance: row.closing,
        interestPaid: schedule
          .filter((r) => r.month <= row.month)
          .reduce((sum, r) => sum + r.interestComponent, 0),
      }));
    }

    return schedule.map((row) => ({
      label: tenureMode === 'years' ? `M${row.month}` : `${row.month}`,
      balance: row.closing,
      interestPaid: schedule
        .filter((r) => r.month <= row.month)
        .reduce((sum, r) => sum + r.interestComponent, 0),
    }));
  }, [schedule, tenureMode]);

  if (!chartData.length) return null;

  const formatCurrency = (v) =>
    v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-ink mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="font-mono text-xs" style={{ color: entry.color }}>
            {entry.name}: ₹{entry.value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider mb-4">
        Loan Burn-Down
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D4C4A" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0D4C4A" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradInterest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8A838" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#E8A838" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#D1D5DB' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: 'Inter' }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="balance"
              name="Outstanding Balance"
              stroke="#0D4C4A"
              strokeWidth={2}
              fill="url(#gradBalance)"
              dot={false}
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="interestPaid"
              name="Cumulative Interest"
              stroke="#E8A838"
              strokeWidth={2}
              fill="url(#gradInterest)"
              dot={false}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
