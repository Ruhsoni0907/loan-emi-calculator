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

const COLORS = ['#0A2540', '#00D4AA', '#FF6B35'];
const BGS = ['#F0F4F8', '#E8FAF5', '#FFF3ED'];

function ScenarioCard({ scenario, index, onChange, onRemove, canRemove, result }) {
  const color = COLORS[index];
  const bg = BGS[index];

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ border: '2px solid ' + color, background: bg }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: color }}>
            {String.fromCharCode(65 + index)}
          </div>
          <input
            type="text"
            value={scenario.label}
            onChange={(e) => onChange(index, 'label', e.target.value)}
            className="font-bold bg-transparent border-b-2 border-dashed text-sm"
            style={{ color: color, borderColor: color }}
          />
        </div>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer"
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-3">
        <Field label="Loan Amount" prefix="₹" value={scenario.principal} onChange={(v) => onChange(index, 'principal', v)} />
        <Field label="Rate" suffix="%" value={scenario.rate} onChange={(v) => onChange(index, 'rate', v)} step={0.1} />
        <Field label="Tenure (months)" value={scenario.tenureMonths} onChange={(v) => onChange(index, 'tenureMonths', v)} />
      </div>

      {result && result.emi !== null && (
        <div className="pt-3 border-t space-y-2" style={{ borderColor: color + '30' }}>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-gray-500">EMI</span>
            <span className="font-mono text-lg font-bold" style={{ color }}>{formatINR(result.emi, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Total Interest</span>
            <span className="font-mono text-xs text-gray-600">{formatINR(result.totalInterest, true)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Total Payable</span>
            <span className="font-mono text-xs font-semibold">{formatINR(result.totalPayable, true)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, prefix, suffix, value, onChange, step = 1 }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step}
          className={'w-full py-2 border border-gray-200 rounded-xl text-xs font-mono bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none ' + (prefix ? 'pl-7 pr-3' : 'px-3')}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">{suffix}</span>}
      </div>
    </div>
  );
}

function ComparisonChart({ results }) {
  const valid = results.filter((r) => r && r.emi !== null);
  if (valid.length === 0) return null;

  const chartData = valid.map((r) => ({
    name: r.label,
    Principal: r.principal,
    Interest: r.totalInterest,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Cost Breakdown</h4>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#546E7A', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E3E8EE' }} />
            <YAxis tickFormatter={(v) => formatINR(v, true)} tick={{ fontSize: 10, fill: '#90A4AE', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} width={55} />
            <Tooltip formatter={(v) => formatINR(v, true)} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
            <Bar dataKey="Principal" fill="#0A2540" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Interest" fill="#FF6B35" radius={[6, 6, 0, 0]} />
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
    if (onResultsChange) onResultsChange(results);
  }, [results, onResultsChange]);

  const handleChange = useCallback((index, field, value) => {
    setScenarios((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    setScenarios((prev) => {
      if (prev.length >= 3) return prev;
      const idx = prev.length;
      return [...prev, {
        principal: 5000000,
        rate: 8.5 + idx * 0.5,
        tenureMonths: 240,
        label: 'Scenario ' + String.fromCharCode(65 + idx),
      }];
    });
  }, []);

  const handleRemove = useCallback((index) => {
    setScenarios((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const validResults = (results || []).filter((r) => r && r.emi !== null);
  const first = validResults[0];
  const others = validResults.slice(1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scenario, i) => (
          <ScenarioCard key={i} scenario={scenario} index={i} onChange={handleChange} onRemove={handleRemove} canRemove={scenarios.length > 1} result={results && results[i]} />
        ))}
        {scenarios.length < 3 && (
          <button onClick={handleAdd} className="rounded-2xl border-2 border-dashed border-gray-300 p-5 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-teal-500 hover:text-teal-500 cursor-pointer min-h-[280px]">
            <div className="text-3xl">+</div>
            <span className="text-sm font-semibold">Add Scenario</span>
            <span className="text-xs text-gray-400">Compare up to 3 loans</span>
          </button>
        )}
      </div>

      {others.length > 0 && first && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Smart Insights</h4>
              <p className="text-xs text-gray-400">How these loans compare</p>
            </div>
          </div>
          <div className="space-y-3">
            {others.map((other, i) => {
              const interestDiff = other.totalInterest - first.totalInterest;
              const emiDiff = other.emi - first.emi;
              const interestFmt = formatINR(Math.abs(interestDiff), true);
              const emiFmt = formatINR(Math.abs(emiDiff), true);
              const saves = interestDiff < 0;

              return (
                <div key={i} className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-semibold text-gray-900 mb-2">{other.label} vs {first.label}</p>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className={'p-2 rounded-lg ' + (interestDiff < 0 ? 'bg-green-50' : 'bg-red-50')}>
                      <p className="text-xs text-gray-500">Total Interest</p>
                      <p className={'font-mono text-sm font-bold ' + (interestDiff < 0 ? 'text-green-600' : 'text-red-600')}>
                        {saves ? '−' : '+'}{interestFmt}
                      </p>
                    </div>
                    <div className={'p-2 rounded-lg ' + (emiDiff < 0 ? 'bg-green-50' : 'bg-red-50')}>
                      <p className="text-xs text-gray-500">Monthly EMI</p>
                      <p className={'font-mono text-sm font-bold ' + (emiDiff < 0 ? 'text-green-600' : 'text-red-600')}>
                        {emiDiff < 0 ? '−' : '+'}{emiFmt}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {saves
                      ? other.label + ' saves ' + interestFmt + ' in total interest, but costs ' + emiFmt + ' more per month.'
                      : other.label + ' costs ' + interestFmt + ' more in total interest, and ' + emiFmt + ' more per month.'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ComparisonChart results={results || []} />
    </div>
  );
}
