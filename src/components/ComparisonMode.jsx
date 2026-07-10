import { useState, useCallback, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { compareLoans, formatINR } from '../lib/emiEngine.js';

/**
 * ComparisonMode — Side-by-side comparison of 2-3 loan scenarios.
 * Signature visual element with dynamic delta callouts.
 */

const SCENARIO_STYLES = [
  { color: '#0A2540', bg: '#F0F4F8', border: '#0A2540', label: 'A' },
  { color: '#00D4AA', bg: '#E8FAF5', border: '#00D4AA', label: 'B' },
  { color: '#FF6B35', bg: '#FFF3ED', border: '#FF6B35', label: 'C' },
];

function ScenarioCard({ scenario, index, onChange, onRemove, canRemove, result }) {
  const style = SCENARIO_STYLES[index];

  return (
    <div
      className="rounded-2xl border-2 p-5 space-y-4 transition-all duration-300 animate-scale-in card-hover"
      style={{ borderColor: style.border, backgroundColor: style.bg }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: style.color }}
          >
            {String.fromCharCode(65 + index)}
          </div>
          <input
            type="text"
            value={scenario.label}
            onChange={(e) => onChange(index, 'label', e.target.value)}
            className="font-bold text-ink bg-transparent border-b-2 border-dashed border-transparent focus:border-current focus:outline-none text-sm"
            placeholder={`Scenario ${String.fromCharCode(65 + index)}`}
          />
        </div>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-faint hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
            aria-label={`Remove ${scenario.label}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <InputField
          label="Loan Amount"
          prefix="₹"
          value={scenario.principal}
          onChange={(v) => onChange(index, 'principal', v)}
          min={50000}
          step={10000}
        />
        <InputField
          label="Rate"
          suffix="%"
          value={scenario.rate}
          onChange={(v) => onChange(index, 'rate', v)}
          min={0.1}
          max={30}
          step={0.1}
        />
        <InputField
          label="Tenure"
          suffix="mo"
          value={scenario.tenureMonths}
          onChange={(v) => onChange(index, 'tenureMonths', v)}
          min={1}
          max={360}
        />
      </div>

      {result && result.emi !== null && (
        <div className="pt-3 border-t border-current/10 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">EMI</span>
            <span className="font-mono text-lg font-bold" style={{ color: style.color }}>
              {formatINR(result.emi, true)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-ink-muted">Interest</span>
            <span className="font-mono text-[11px] font-semibold text-ink-muted">
              {formatINR(result.totalInterest, true)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-ink-muted">Total</span>
            <span className="font-mono text-[11px] font-semibold text-ink">
              {formatINR(result.totalPayable, true)}
            </span>
          </div>

          {/* Mini bar */}
          <div className="h-1.5 bg-black/5 rounded-full overflow-hidden flex mt-2">
            <div
              className="rounded-full"
              style={{
                width: `${(result.principal / result.totalPayable) * 100}%`,
                backgroundColor: style.color,
              }}
            />
            <div
              className="rounded-full"
              style={{
                width: `${(result.totalInterest / result.totalPayable) * 100}%`,
                backgroundColor: style.color,
                opacity: 0.3,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, prefix, suffix, value, onChange, min, max, step }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-xs font-mono pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className={`w-full ${prefix ? 'pl-7' : 'pl-3'} pr-2 py-2 border border-current/10 rounded-xl text-xs font-mono bg-white/80 focus:bg-white focus:border-current focus:ring-2 focus:ring-current/10 transition-all`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint text-[10px] font-mono pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function DeltaInsights({ results }) {
  const valid = results.filter((r) => r?.emi !== null);
  if (valid.length < 2) return null;

  const first = valid[0];

  return (
    <div className="bg-white rounded-2xl border border-border p-6 space-y-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-ink">Smart Insights</h4>
          <p className="text-[10px] text-ink-faint">Dynamic comparison based on your scenarios</p>
        </div>
      </div>

      <div className="space-y-3">
        {valid.slice(1).map((other, i) => {
          const interestDiff = other.totalInterest - first.totalInterest;
          const emiDiff = other.emi - first.emi;
          const interestFmt = formatINR(Math.abs(interestDiff), true);
          const emiFmt = formatINR(Math.abs(emiDiff), true);
          const interestPct = first.totalInterest > 0 ? Math.round((interestDiff / first.totalInterest) * 100) : 0;

          if (Math.abs(interestDiff) < 100 && Math.abs(emiDiff) < 10) {
            return (
              <div key={i} className="flex items-center gap-3 p-3 bg-surface-cool rounded-xl">
                <div className="w-2 h-2 rounded-full bg-ink-faint" />
                <p className="text-xs text-ink-muted">
                  <strong>{other.label}</strong> and <strong>{first.label}</strong> have nearly identical costs.
                </p>
              </div>
            );
          }

          const interestBetter = interestDiff < 0;
          const emiBetter = emiDiff < 0;

          return (
            <div key={i} className="p-4 bg-surface-cool rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: SCENARIO_STYLES[valid.indexOf(other)]?.color }}
                />
                <p className="text-xs font-bold text-ink">
                  {other.label} vs {first.label}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-2 rounded-lg ${interestBetter ? 'bg-success/10' : 'bg-danger/10'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Interest</p>
                  <p className={`font-mono text-sm font-bold ${interestBetter ? 'text-success' : 'text-danger'}`}>
                    {interestBetter ? '−' : '+'}{interestFmt}
                  </p>
                  <p className="text-[10px] text-ink-faint">
                    {interestBetter ? 'saves' : 'costs more'} {Math.abs(interestPct)}%
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${emiBetter ? 'bg-success/10' : 'bg-danger/10'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Monthly EMI</p>
                  <p className={`font-mono text-sm font-bold ${emiBetter ? 'text-success' : 'text-danger'}`}>
                    {emiBetter ? '−' : '+'}{emiFmt}
                  </p>
                  <p className="text-[10px] text-ink-faint">
                    {emiBetter ? 'less' : 'more'} per month
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                {interestBetter
                  ? `${other.label} saves you ${interestFmt} in total interest, but costs ${emiFmt} more per month.`
                  : `${other.label} costs ${interestFmt} more in total interest, and ${emiFmt} more per month.`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonChart({ results }) {
  const valid = results.filter((r) => r?.emi !== null);
  if (valid.length === 0) return null;

  const chartData = valid.map((r) => ({
    name: r.label,
    principal: r.principal,
    interest: r.totalInterest,
    total: r.totalPayable,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-xl shadow-xl p-4 text-sm min-w-[160px]">
        <p className="font-bold text-ink mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
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
    <div className="bg-white rounded-2xl border border-border p-6 animate-slide-up">
      <h4 className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-5">
        Cost Comparison
      </h4>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#546E7A', fontFamily: 'Inter', fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: '#E3E8EE' }}
            />
            <YAxis
              tickFormatter={(v) => formatINR(v, true)}
              tick={{ fontSize: 10, fill: '#90A4AE', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: 'Inter', paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="principal"
              name="Principal"
              fill="#0A2540"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            />
            <Bar
              dataKey="interest"
              name="Interest"
              fill="#FF6B35"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ComparisonMode({ onResultsChange }) {
  const [scenarios, setScenarios] = useState([
    { principal: 5000000, rate: 8.5, tenureMonths: 240, label: 'Bank A' },
    { principal: 5000000, rate: 9.0, tenureMonths: 240, label: 'Bank B' },
  ]);

  const results = compareLoans(scenarios);

  useEffect(() => {
    onResultsChange?.(results);
  }, [results, onResultsChange]);

  const handleChange = useCallback((index, field, value) => {
    setScenarios((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    if (scenarios.length >= 3) return;
    const idx = scenarios.length;
    setScenarios((prev) => [
      ...prev,
      {
        principal: 5000000,
        rate: 8.5 + idx * 0.5,
        tenureMonths: 240,
        label: `Scenario ${String.fromCharCode(65 + idx)}`,
      },
    ]);
  }, [scenarios.length]);

  const handleRemove = useCallback((index) => {
    setScenarios((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="space-y-8">
      {/* Scenario cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scenario, i) => (
          <ScenarioCard
            key={i}
            scenario={scenario}
            index={i}
            onChange={handleChange}
            onRemove={handleRemove}
            canRemove={scenarios.length > 1}
            result={results?.[i]}
          />
        ))}
        {scenarios.length < 3 && (
          <button
            onClick={handleAdd}
            className="rounded-2xl border-2 border-dashed border-border p-5 flex flex-col items-center justify-center gap-3 text-ink-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-all duration-300 cursor-pointer min-h-[280px] group"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-cool group-hover:bg-accent/10 flex items-center justify-center transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Add Scenario</span>
            <span className="text-[10px] text-ink-faint">Compare up to 3 loans</span>
          </button>
        )}
      </div>

      {/* Insights */}
      <DeltaInsights results={results || []} />

      {/* Chart */}
      <ComparisonChart results={results || []} />
    </div>
  );
}
