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
  Cell,
} from 'recharts';
import { compareLoans } from '../lib/emiEngine.js';

/**
 * ComparisonMode — Side-by-side comparison of 2-3 loan scenarios.
 *
 * This is the signature visual element of the app.
 * Features:
 *  - Configurable scenario cards with add/remove
 *  - Dynamic delta callouts in plain language
 *  - Grouped bar chart comparing principal vs interest across scenarios
 *  - Color-coded by scenario (teal, amber, purple)
 */

const SCENARIO_COLORS = ['#0D4C4A', '#E8A838', '#7C3AED'];
const SCENARIO_LABELS = ['Scenario A', 'Scenario B', 'Scenario C'];
const SCENARIO_LIGHT = ['#E8F5F4', '#FDF3E0', '#F0E8FF'];

function ScenarioCard({ scenario, index, onChange, onRemove, canRemove, result }) {
  const color = SCENARIO_COLORS[index];
  const lightBg = SCENARIO_LIGHT[index];

  return (
    <div
      className="rounded-xl border-2 p-5 space-y-4 transition-all"
      style={{ borderColor: color, backgroundColor: lightBg }}
    >
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={scenario.label}
          onChange={(e) => onChange(index, 'label', e.target.value)}
          className="font-semibold text-ink bg-transparent border-b-2 border-dashed focus:border-solid focus:outline-none"
          style={{ borderColor: `${color}60` }}
          aria-label={`Label for scenario ${index + 1}`}
          placeholder={`Scenario ${String.fromCharCode(65 + index)}`}
        />
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="text-ink-faint hover:text-danger transition-colors text-lg leading-none cursor-pointer"
            aria-label={`Remove ${scenario.label}`}
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-ink-muted block mb-1">Loan Amount (₹)</label>
          <input
            type="number"
            value={scenario.principal}
            onChange={(e) => onChange(index, 'principal', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            min={50000}
            step={10000}
          />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Rate (%)</label>
          <input
            type="number"
            value={scenario.rate}
            onChange={(e) => onChange(index, 'rate', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            min={0.1}
            max={30}
            step={0.1}
          />
        </div>
        <div>
          <label className="text-xs text-ink-muted block mb-1">Tenure (months)</label>
          <input
            type="number"
            value={scenario.tenureMonths}
            onChange={(e) => onChange(index, 'tenureMonths', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            min={1}
            max={360}
          />
        </div>
      </div>

      {result && result.emi !== null && (
        <div className="pt-3 border-t space-y-2" style={{ borderColor: `${color}30` }}>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">EMI</span>
            <span className="font-mono font-semibold" style={{ color }}>
              ₹{result.emi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Total Interest</span>
            <span className="font-mono text-xs">
              ₹{result.totalInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Total Payable</span>
            <span className="font-mono text-xs">
              ₹{result.totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function DeltaCallout({ results }) {
  const valid = results.filter((r) => r?.emi !== null);
  if (valid.length < 2) return null;

  const first = valid[0];
  const others = valid.slice(1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
        Comparison Insights
      </h4>
      {others.map((other, i) => {
        const interestDiff = other.totalInterest - first.totalInterest;
        const emiDiff = other.emi - first.emi;
        const interestFmt = Math.abs(interestDiff).toLocaleString('en-IN', { maximumFractionDigits: 0 });
        const emiFmt = Math.abs(emiDiff).toLocaleString('en-IN', { maximumFractionDigits: 0 });

        if (Math.abs(interestDiff) < 1 && Math.abs(emiDiff) < 1) {
          return (
            <p key={i} className="text-sm text-ink-muted">
              <strong>{other.label}</strong> and <strong>{first.label}</strong> are equivalent in cost.
            </p>
          );
        }

        const interestBetter = interestDiff < 0;
        const emiBetter = emiDiff < 0;

        return (
          <div key={i} className="text-sm leading-relaxed space-y-1">
            <p>
              <strong>{other.label}</strong>{' '}
              {interestBetter ? (
                <span className="text-success font-medium">saves ₹{interestFmt}</span>
              ) : (
                <span className="text-danger font-medium">costs ₹{interestFmt} more</span>
              )}{' '}
              in total interest vs <strong>{first.label}</strong>, but{' '}
              {emiBetter ? (
                <span className="text-success font-medium">costs ₹{emiFmt} less</span>
              ) : (
                <span className="text-danger font-medium">costs ₹{emiFmt} more</span>
              )}{' '}
              per month.
            </p>
          </div>
        );
      })}
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
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-ink mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="font-mono text-xs" style={{ color: entry.fill || entry.color }}>
            {entry.name}: ₹{entry.value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <h4 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4">
        Total Cost Breakdown
      </h4>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6B7280', fontFamily: 'Inter', fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: '#D1D5DB' }}
            />
            <YAxis
              tickFormatter={(v) =>
                v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${(v / 1000).toFixed(0)}K`
              }
              tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: 'Inter' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="principal"
              name="Principal"
              fill="#0D4C4A"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
            <Bar
              dataKey="interest"
              name="Interest"
              fill="#E8A838"
              radius={[4, 4, 0, 0]}
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
    { principal: 1000000, rate: 8.5, tenureMonths: 120, label: 'Scenario A' },
    { principal: 1000000, rate: 9.5, tenureMonths: 120, label: 'Scenario B' },
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
        principal: 1000000,
        rate: 8.5 + idx,
        tenureMonths: 120,
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
            className="rounded-xl border-2 border-dashed border-gray-300 p-5 flex flex-col items-center justify-center gap-2 text-ink-muted hover:border-primary hover:text-primary transition-all cursor-pointer min-h-[200px]"
          >
            <span className="text-3xl leading-none">+</span>
            <span className="text-sm font-medium">Add Scenario</span>
          </button>
        )}
      </div>

      {/* Delta callout */}
      <DeltaCallout results={results || []} />

      {/* Chart */}
      <ComparisonChart results={results || []} />
    </div>
  );
}
