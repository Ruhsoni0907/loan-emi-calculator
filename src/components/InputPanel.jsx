import { useState, useCallback, useMemo } from 'react';
import { LOAN_PRESETS, validateInputs } from '../lib/emiEngine.js';

/**
 * InputPanel — Loan parameter inputs with presets, validation, and polished UX.
 */
export default function InputPanel({ values, onChange, tenureMode, onTenureModeChange }) {
  const { principal, annualRate, tenureYears, tenureMonths } = values;
  const [activePreset, setActivePreset] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const effectiveTenure = tenureMode === 'years' ? tenureYears : tenureMonths;
  const maxTenure = tenureMode === 'years' ? 30 : 360;
  const minTenure = 1;

  const validation = useMemo(
    () => validateInputs(principal, annualRate, effectiveTenure),
    [principal, annualRate, effectiveTenure]
  );

  const handlePreset = useCallback((preset) => {
    setActivePreset(preset.id);
    onChange({
      principal: preset.principal,
      annualRate: preset.rate,
      tenureYears: preset.tenureYears,
      tenureMonths: preset.tenureYears * 12,
    });
    onTenureModeChange('years');
  }, [onChange, onTenureModeChange]);

  const handleSliderChange = useCallback(
    (field, rawValue) => {
      const value = Number(rawValue);
      if (isNaN(value)) return;
      setActivePreset(null);
      const next = { ...values };
      if (field === 'principal') next.principal = value;
      else if (field === 'annualRate') next.annualRate = value;
      else if (field === 'tenure') {
        if (tenureMode === 'years') next.tenureYears = value;
        else next.tenureMonths = value;
      }
      onChange(next);
    },
    [values, onChange, tenureMode]
  );

  const handleNumberChange = useCallback(
    (field, rawValue) => {
      const value = parseFloat(rawValue);
      if (isNaN(value)) return;
      setActivePreset(null);
      handleSliderChange(field, value);
    },
    [handleSliderChange]
  );

  const inputConfig = [
    {
      id: 'principal',
      label: 'Loan Amount',
      sublabel: 'Principal',
      field: 'principal',
      value: principal,
      min: 50000,
      max: 10000000,
      step: 10000,
      prefix: '₹',
      suffix: '',
      format: (v) => v.toLocaleString('en-IN'),
      error: showErrors ? validation.errors.principal : null,
    },
    {
      id: 'annualRate',
      label: 'Interest Rate',
      sublabel: 'per annum',
      field: 'annualRate',
      value: annualRate,
      min: 0.1,
      max: 30,
      step: 0.1,
      prefix: '',
      suffix: '%',
      format: (v) => v.toFixed(1),
      error: showErrors ? validation.errors.annualRate : null,
    },
    {
      id: 'tenure',
      label: `Tenure`,
      sublabel: tenureMode === 'years' ? 'years' : 'months',
      field: 'tenure',
      value: effectiveTenure,
      min: minTenure,
      max: maxTenure,
      step: 1,
      prefix: '',
      suffix: tenureMode === 'years' ? ' yr' : ' mo',
      format: (v) => String(v),
      error: showErrors ? validation.errors.tenureMonths : null,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Preset Templates */}
      <div>
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-3">
          Quick Start
        </p>
        <div className="grid grid-cols-2 gap-2">
          {LOAN_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePreset(preset)}
              className={`group relative p-3 rounded-xl text-left transition-all duration-200 cursor-pointer border-2 ${
                activePreset === preset.id
                  ? 'border-accent bg-accent/5 shadow-sm'
                  : 'border-transparent bg-surface-cool hover:bg-white hover:border-border hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-xl leading-none mt-0.5">{preset.icon}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    activePreset === preset.id ? 'text-accent' : 'text-ink group-hover:text-ink'
                  }`}>
                    {preset.name}
                  </p>
                  <p className="text-xs text-ink-faint truncate">{preset.description}</p>
                </div>
              </div>
              {activePreset === preset.id && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent animate-scale-in" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-medium text-ink-faint">or enter manually</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Tenure mode toggle */}
      <div>
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-3">
          Tenure Unit
        </p>
        <div className="flex items-center gap-1 bg-surface-cool rounded-xl p-1 border border-border w-fit">
          <button
            onClick={() => onTenureModeChange('years')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
              tenureMode === 'years'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-ink-muted hover:text-ink hover:bg-white'
            }`}
          >
            Years
          </button>
          <button
            onClick={() => onTenureModeChange('months')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
              tenureMode === 'months'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-ink-muted hover:text-ink hover:bg-white'
            }`}
          >
            Months
          </button>
        </div>
      </div>

      {/* Input fields */}
      <div className="space-y-5">
        {inputConfig.map(({ id, label, sublabel, field, value, min, max, step, prefix, suffix, format, error }) => (
          <div key={id} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor={id} className="text-sm font-semibold text-ink">
                {label}
                <span className="text-ink-faint font-normal ml-1.5 text-xs">{sublabel}</span>
              </label>
              <div className="flex items-baseline gap-0.5">
                {prefix && <span className="text-sm text-ink-faint font-mono">{prefix}</span>}
                <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                  {format(value)}
                </span>
                {suffix && <span className="text-xs text-ink-faint font-mono">{suffix}</span>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => handleSliderChange(field, e.target.value)}
                className="flex-1"
                style={{ '--progress': `${((value - min) / (max - min)) * 100}%` }}
                aria-label={`${label} slider`}
              />
              <div className="relative">
                {prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm font-mono pointer-events-none">
                    {prefix}
                  </span>
                )}
                <input
                  id={id}
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => handleNumberChange(field, e.target.value)}
                  onBlur={() => setShowErrors(true)}
                  className={`w-36 pl-7 pr-2 py-2.5 border rounded-xl text-sm font-mono text-ink bg-white transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20 ${
                    error ? 'border-danger bg-danger/5' : 'border-border hover:border-ink-faint'
                  }`}
                  aria-label={`${label} value`}
                />
              </div>
            </div>

            <div className="flex justify-between text-[10px] text-ink-faint font-mono px-0.5">
              <span>{prefix}{format(min)}{suffix}</span>
              <span>{prefix}{format(max)}{suffix}</span>
            </div>

            {error && (
              <p className="text-xs text-danger flex items-center gap-1.5 animate-fade-in">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
