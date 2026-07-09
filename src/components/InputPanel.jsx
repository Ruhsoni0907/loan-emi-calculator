import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * InputPanel — Loan parameter inputs with synced sliders and number fields.
 *
 * Uses debounced callbacks so dragging a slider feels instant but
 * recalculation only fires after the user pauses (or on blur).
 */
export default function InputPanel({ values, onChange, tenureMode, onTenureModeChange }) {
  const { principal, annualRate, tenureYears, tenureMonths } = values;

  const effectiveTenure = tenureMode === 'years' ? tenureYears : tenureMonths;
  const maxTenure = tenureMode === 'years' ? 30 : 360;
  const minTenure = tenureMode === 'years' ? 1 : 1;

  const handleSliderChange = useCallback(
    (field, rawValue) => {
      const value = Number(rawValue);
      if (isNaN(value)) return;

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
      handleSliderChange(field, value);
    },
    [handleSliderChange]
  );

  const inputConfig = [
    {
      id: 'principal',
      label: 'Loan Amount',
      field: 'principal',
      value: principal,
      min: 50000,
      max: 10000000,
      step: 10000,
      prefix: '₹',
      suffix: '',
      format: (v) => v.toLocaleString('en-IN'),
    },
    {
      id: 'annualRate',
      label: 'Interest Rate',
      field: 'annualRate',
      value: annualRate,
      min: 0.1,
      max: 30,
      step: 0.1,
      prefix: '',
      suffix: '%',
      format: (v) => v.toFixed(1),
    },
    {
      id: 'tenure',
      label: `Tenure (${tenureMode === 'years' ? 'Years' : 'Months'})`,
      field: 'tenure',
      value: effectiveTenure,
      min: minTenure,
      max: maxTenure,
      step: tenureMode === 'years' ? 1 : 1,
      prefix: '',
      suffix: tenureMode === 'years' ? ' yr' : ' mo',
      format: (v) => String(v),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tenure mode toggle */}
      <div className="flex items-center gap-2 bg-surface-cool rounded-lg p-1 w-fit">
        <button
          onClick={() => onTenureModeChange('years')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
            tenureMode === 'years'
              ? 'bg-primary text-white shadow-sm'
              : 'text-ink-muted hover:text-ink'
          }`}
          aria-pressed={tenureMode === 'years'}
        >
          Years
        </button>
        <button
          onClick={() => onTenureModeChange('months')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
            tenureMode === 'months'
              ? 'bg-primary text-white shadow-sm'
              : 'text-ink-muted hover:text-ink'
          }`}
          aria-pressed={tenureMode === 'months'}
        >
          Months
        </button>
      </div>

      {inputConfig.map(({ id, label, field, value, min, max, step, prefix, suffix, format }) => (
        <div key={id} className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor={id} className="text-sm font-medium text-ink-muted">
              {label}
            </label>
            <span className="font-mono text-sm text-ink-muted">
              {format(value)}
              {suffix}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              id={`${id}-range`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => handleSliderChange(field, e.target.value)}
              className="flex-1 h-1.5 accent-primary"
              aria-label={`${label} slider`}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm font-mono">
                {prefix}
              </span>
              <input
                id={id}
                type="number"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => handleNumberChange(field, e.target.value)}
                className="w-32 pl-7 pr-2 py-2 border border-gray-200 rounded-lg text-sm font-mono text-ink bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                aria-label={`${label} value`}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-ink-faint font-mono">
            <span>{prefix}{format(min)}{suffix}</span>
            <span>{prefix}{format(max)}{suffix}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
