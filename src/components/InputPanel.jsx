import { useState, useCallback, useMemo } from 'react';
import { PRESETS, validateInputs } from '../lib/emiEngine.js';

const FREQ_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half-yearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function InputPanel({ values, onChange }) {
  const [activePreset, setActivePreset] = useState(null);

  const tenureMode = values.tenureMode || 'years';
  const effectiveTenure = tenureMode === 'years' ? values.tenureYears : values.tenureMonths;
  const maxTenure = tenureMode === 'years' ? 30 : 360;

  const validation = useMemo(
    () => validateInputs(values.principal, values.annualRate, effectiveTenure),
    [values.principal, values.annualRate, effectiveTenure]
  );

  const set = useCallback((field, value) => {
    setActivePreset(null);
    onChange({ ...values, [field]: value });
  }, [values, onChange]);

  const setTenure = useCallback((years) => {
    setActivePreset(null);
    onChange({
      ...values,
      tenureYears: years,
      tenureMonths: years * 12,
    });
  }, [values, onChange]);

  const handlePreset = useCallback((p) => {
    setActivePreset(p.id);
    onChange({
      ...values,
      principal: p.principal,
      annualRate: p.rate,
      tenureYears: p.tenure,
      tenureMonths: p.tenure * 12,
    });
  }, [values, onChange]);

  const handleReset = useCallback(() => {
    setActivePreset(null);
    onChange({
      principal: 1000000, annualRate: 8.5, tenureYears: 10, tenureMonths: 120,
      tenureMode: 'years', frequency: 'monthly', processingFeePct: 1, gstPct: 18,
      downPayment: 0, extraPayment: 0,
    });
  }, [onChange]);

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-faint)' }}>Quick Start</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => handlePreset(p)}
              className="p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer"
              style={{
                background: activePreset === p.id ? p.color + '12' : 'var(--input-bg)',
                border: activePreset === p.id ? '2px solid ' + p.color : '2px solid transparent',
              }}>
              <span className="text-lg">{p.icon}</span>
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text)' }}>{p.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Loan Amount */}
      <Field label="Loan Amount" value={values.principal} onChange={v => set('principal', v)}
        min={10000} max={100000000} step={10000} prefix="₹" format={v => v.toLocaleString('en-IN')}
        error={validation.errors.principal} />

      {/* Interest Rate */}
      <Field label="Interest Rate" sublabel="per annum" value={values.annualRate} onChange={v => set('annualRate', v)}
        min={0.1} max={50} step={0.1} suffix="%" format={v => v.toFixed(1)}
        error={validation.errors.annualRate} />

      {/* Tenure */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Tenure <span className="font-normal text-xs" style={{ color: 'var(--text-faint)' }}>{tenureMode === 'years' ? 'years' : 'months'}</span>
          </label>
          <span className="font-mono text-sm font-semibold" style={{ color: '#635BFF' }}>
            {effectiveTenure} {tenureMode === 'years' ? 'yr' : 'mo'}
          </span>
        </div>
        <input type="range" min={1} max={maxTenure} step={1} value={effectiveTenure}
          onChange={e => setTenure(Number(e.target.value))}
          className="w-full" />
        <div className="flex justify-between mt-4">
          <button onClick={() => set('tenureMode', 'years')}
            className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            style={{ background: tenureMode === 'years' ? '#635BFF' : 'var(--input-bg)', color: tenureMode === 'years' ? 'white' : 'var(--text-secondary)', border: tenureMode === 'years' ? 'none' : '1px solid var(--card-border)' }}>
            Years
          </button>
          <button onClick={() => set('tenureMode', 'months')}
            className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            style={{ background: tenureMode === 'months' ? '#635BFF' : 'var(--input-bg)', color: tenureMode === 'months' ? 'white' : 'var(--text-secondary)', border: tenureMode === 'months' ? 'none' : '1px solid var(--card-border)' }}>
            Months
          </button>
        </div>
      </div>

      {/* Payment Frequency */}
      <div>
        <label className="text-sm font-semibold block mb-2" style={{ color: 'var(--text)' }}>Payment Frequency</label>
        <div className="grid grid-cols-2 gap-1.5" style={{ background: 'var(--input-bg)', borderRadius: 12, padding: 4 }}>
          {FREQ_OPTIONS.map(f => (
            <button key={f.value} onClick={() => set('frequency', f.value)}
              className="py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              style={{ background: values.frequency === f.value ? '#635BFF' : 'transparent', color: values.frequency === f.value ? 'white' : 'var(--text-secondary)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Processing Fee */}
      <Field label="Processing Fee" value={values.processingFeePct} onChange={v => set('processingFeePct', v)}
        min={0} max={5} step={0.1} suffix="%" format={v => v.toFixed(1)} />

      {/* Down Payment */}
      <Field label="Down Payment" value={values.downPayment} onChange={v => set('downPayment', v)}
        min={0} max={values.principal * 0.5} step={10000} prefix="₹" format={v => v.toLocaleString('en-IN')} />

      {/* Extra Monthly Payment */}
      <Field label="Extra Monthly Payment" sublabel="over & above EMI" value={values.extraPayment} onChange={v => set('extraPayment', v)}
        min={0} max={100000} step={1000} prefix="₹" format={v => v.toLocaleString('en-IN')} />

      {/* Reset */}
      <button onClick={handleReset} className="btn btn-ghost w-full justify-center">
        Reset Calculator
      </button>
    </div>
  );
}

function Field({ label, sublabel, value, onChange, min, max, step, prefix, suffix, format, error }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {label} {sublabel && <span className="font-normal text-xs" style={{ color: 'var(--text-faint)' }}>{sublabel}</span>}
        </label>
        <span className="font-mono text-sm font-semibold" style={{ color: '#635BFF' }}>
          {prefix}{format(value)}{suffix}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))} className="flex-1" />
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{prefix}</span>}
          <input type="number" min={min} max={max} step={step} value={value}
            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
            className={prefix ? 'pl-7 pr-2 w-32' : 'px-3 w-32'}
            style={error ? { borderColor: '#E53935' } : {}} />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{suffix}</span>}
        </div>
      </div>
      {error && <p className="text-xs mt-1.5" style={{ color: '#E53935' }}>⚠ {error}</p>}
    </div>
  );
}
