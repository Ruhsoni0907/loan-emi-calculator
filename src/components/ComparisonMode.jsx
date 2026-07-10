import { useState, useCallback, useEffect, useMemo } from 'react';
import { compareLoans, calculateLoanDetails, formatINR, saveScenarios, loadScenarios } from '../lib/emiEngine.js';
import { showToast } from './Toast.jsx';

const SCENARIO_COLORS = ['#635BFF', '#00D4AA', '#FF6B35'];

export default function ComparisonMode() {
  const [scenarios, setScenarios] = useState(() => {
    const saved = loadScenarios();
    return saved.length ? saved : [
      { id: 1, principal: 5000000, rate: 8.5, tenureMonths: 240, processingFeePct: 1, downPayment: 0, extraPayment: 0, label: 'Bank A' },
      { id: 2, principal: 5000000, rate: 9.0, tenureMonths: 240, processingFeePct: 0.5, downPayment: 0, extraPayment: 0, label: 'Bank B' },
    ];
  });

  useEffect(() => {
    saveScenarios(scenarios);
  }, [scenarios]);

  const results = useMemo(() => compareLoans(scenarios), [scenarios]);

  const updateScenario = useCallback((id, field, value) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const addScenario = useCallback(() => {
    if (scenarios.length >= 3) return;
    const id = Date.now();
    setScenarios(prev => [...prev, {
      id, principal: 5000000, rate: 8.5 + prev.length * 0.5, tenureMonths: 240,
      processingFeePct: 1, downPayment: 0, extraPayment: 0,
      label: 'Scenario ' + String.fromCharCode(65 + prev.length),
    }]);
  }, [scenarios.length]);

  const removeScenario = useCallback((id) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  }, []);

  const resetScenarios = useCallback(() => {
    setScenarios([
      { id: 1, principal: 5000000, rate: 8.5, tenureMonths: 240, processingFeePct: 1, downPayment: 0, extraPayment: 0, label: 'Bank A' },
      { id: 2, principal: 5000000, rate: 9.0, tenureMonths: 240, processingFeePct: 0.5, downPayment: 0, extraPayment: 0, label: 'Bank B' },
    ]);
  }, []);

  const validResults = (results || []).filter(r => r?.details);
  const first = validResults[0];
  const others = validResults.slice(1);

  return (
    <div className="space-y-6">
      {/* Scenario cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scenario, i) => (
          <ScenarioCard key={scenario.id} scenario={scenario} index={i}
            onChange={updateScenario} onRemove={removeScenario}
            canRemove={scenarios.length > 1}
            result={results?.find(r => r.id === scenario.id)} />
        ))}
        {scenarios.length < 3 && (
          <button onClick={addScenario}
            className="rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[300px] transition-all duration-300"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-faint)' }}>
            <div className="text-4xl font-light">+</div>
            <span className="text-sm font-semibold">Add Scenario</span>
          </button>
        )}
      </div>

      {/* Insights */}
      {others.length > 0 && first && (
        <div className="glass-card-static p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,91,255,0.1)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#635BFF" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            </div>
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Smart Insights</h4>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>How your loan options compare</p>
            </div>
          </div>
          <div className="space-y-3">
            {others.map((other, i) => {
              const intDiff = other.details.totalInterest - first.details.totalInterest;
              const emiDiff = other.details.emi - first.details.emi;
              return (
                <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--input-bg)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>{other.label} vs {first.label}</p>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="p-2.5 rounded-lg" style={{ background: intDiff < 0 ? 'rgba(0,200,83,0.1)' : 'rgba(229,57,53,0.1)' }}>
                      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-faint)' }}>Interest</p>
                      <p className="font-mono text-sm font-bold" style={{ color: intDiff < 0 ? '#00C853' : '#E53935' }}>
                        {intDiff < 0 ? '−' : '+'}{formatINR(Math.abs(intDiff), true)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg" style={{ background: emiDiff < 0 ? 'rgba(0,200,83,0.1)' : 'rgba(229,57,53,0.1)' }}>
                      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-faint)' }}>EMI</p>
                      <p className="font-mono text-sm font-bold" style={{ color: emiDiff < 0 ? '#00C853' : '#E53935' }}>
                        {emiDiff < 0 ? '−' : '+'}{formatINR(Math.abs(emiDiff), true)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {intDiff < 0
                      ? `${other.label} saves ${formatINR(Math.abs(intDiff), true)} in interest.`
                      : `${other.label} costs ${formatINR(Math.abs(intDiff), true)} more in interest.`}
                    {emiDiff !== 0 && ` EMI is ${emiDiff < 0 ? 'lower' : 'higher'} by ${formatINR(Math.abs(emiDiff), true)}.`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison bar */}
      {validResults.length > 0 && (
        <div className="glass-card-static p-6">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-faint)' }}>Cost Comparison</h4>
          <div className="space-y-4">
            {validResults.map((r, i) => {
              const maxTotal = Math.max(...validResults.map(v => v.details.totalPayable));
              const pct = (r.details.totalPayable / maxTotal) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.label}</span>
                    <span className="font-mono text-sm font-bold" style={{ color: SCENARIO_COLORS[i % 3] }}>
                      {formatINR(r.details.totalPayable, true)}
                    </span>
                  </div>
                  <div className="h-8 rounded-xl overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                    <div className="h-full rounded-xl flex items-center px-3 transition-all duration-700"
                      style={{ width: pct + '%', background: SCENARIO_COLORS[i % 3] }}>
                      <span className="text-xs font-bold text-white drop-shadow">
                        {formatINR(r.details.emi)}/mo
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button onClick={resetScenarios} className="btn btn-ghost">Reset Scenarios</button>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, index, onChange, onRemove, canRemove, result }) {
  const color = SCENARIO_COLORS[index % 3];

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ border: '2px solid ' + color + '30', background: color + '08' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: color }}>
            {String.fromCharCode(65 + index)}
          </div>
          <input type="text" value={scenario.label}
            onChange={e => onChange(scenario.id, 'label', e.target.value)}
            className="font-bold text-sm bg-transparent border-b border-dashed outline-none"
            style={{ color: 'var(--text)', borderColor: color + '60' }} />
        </div>
        {canRemove && (
          <button onClick={() => onRemove(scenario.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: 'var(--text-faint)' }}>
            ×
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        <MiniField label="Amount" prefix="₹" value={scenario.principal} onChange={v => onChange(scenario.id, 'principal', v)} />
        <MiniField label="Rate" suffix="%" value={scenario.rate} onChange={v => onChange(scenario.id, 'rate', v)} step={0.1} />
        <MiniField label="Tenure" suffix="mo" value={scenario.tenureMonths} onChange={v => onChange(scenario.id, 'tenureMonths', v)} />
        <MiniField label="Processing" suffix="%" value={scenario.processingFeePct} onChange={v => onChange(scenario.id, 'processingFeePct', v)} step={0.1} />
      </div>

      {result?.details && (
        <div className="pt-3 space-y-1.5" style={{ borderTop: '1px solid ' + color + '20' }}>
          <Row label="EMI" value={formatINR(result.details.emi)} bold color={color} />
          <Row label="Interest" value={formatINR(result.details.totalInterest, true)} />
          <Row label="Total" value={formatINR(result.details.totalPayableWithFee, true)} bold />
        </div>
      )}
    </div>
  );
}

function MiniField({ label, prefix, suffix, value, onChange, step = 1 }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-faint)' }}>{label}</span>
      <div className="relative">
        {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{prefix}</span>}
        <input type="number" value={value} step={step} onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
          className={prefix ? 'pl-6 pr-2 w-28 text-right' : 'px-2 w-28 text-right'}
          style={{ fontSize: 12, padding: '6px 8px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 10, fontFamily: 'var(--font-mono)', color: 'var(--text)', outline: 'none' }} />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-faint)' }}>{label}</span>
      <span className="font-mono text-xs" style={{ fontWeight: bold ? 700 : 500, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}
