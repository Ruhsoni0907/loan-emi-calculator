import { useState, useMemo, useCallback } from 'react';
import InputPanel from './components/InputPanel.jsx';
import ResultSummary from './components/ResultSummary.jsx';
import BurnDownChart from './components/BurnDownChart.jsx';
import AmortizationTable from './components/AmortizationTable.jsx';
import ComparisonMode from './components/ComparisonMode.jsx';
import PDFExport from './components/PDFExport.jsx';
import {
  calculateEMI,
  generateAmortizationSchedule,
} from './lib/emiEngine.js';

/**
 * App — Root component for the Loan EMI Calculator.
 *
 * Manages global state and orchestrates the calculator layout.
 * Two modes: Calculator (single loan) and Comparison (side-by-side).
 */
export default function App() {
  const [mode, setMode] = useState('calculator'); // 'calculator' | 'comparison'
  const [tenureMode, setTenureMode] = useState('years');
  const [comparisonResults, setComparisonResults] = useState(null);
  const [values, setValues] = useState({
    principal: 1000000,
    annualRate: 8.5,
    tenureYears: 10,
    tenureMonths: 120,
  });

  const tenureMonths = useMemo(
    () => (tenureMode === 'years' ? values.tenureYears * 12 : values.tenureMonths),
    [tenureMode, values.tenureYears, values.tenureMonths]
  );

  const emi = useMemo(
    () => calculateEMI(values.principal, values.annualRate, tenureMonths),
    [values.principal, values.annualRate, tenureMonths]
  );

  const schedule = useMemo(
    () => generateAmortizationSchedule(values.principal, values.annualRate, tenureMonths),
    [values.principal, values.annualRate, tenureMonths]
  );

  const loanData = useMemo(() => {
    if (emi === null) return null;
    const totalPayable = Math.round(emi * tenureMonths * 100) / 100;
    const totalInterest = Math.round((totalPayable - values.principal) * 100) / 100;
    return {
      principal: values.principal,
      annualRate: values.annualRate,
      tenureMonths,
      emi,
      totalInterest,
      totalPayable,
    };
  }, [emi, values.principal, values.annualRate, tenureMonths]);

  const handleValuesChange = useCallback((next) => {
    setValues((prev) => ({ ...prev, ...next }));
  }, []);

  return (
    <div className="min-h-screen bg-surface-warm">
      {/* Header */}
      <header className="bg-primary text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">
                EMI Calculator
              </h1>
              <p className="text-primary-light text-sm mt-1">
                Loan planning made clear
              </p>
            </div>
            <div className="flex items-center gap-2 bg-primary-dark/40 rounded-lg p-1 w-fit">
              <button
                onClick={() => setMode('calculator')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                  mode === 'calculator'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-primary-light hover:text-white'
                }`}
                aria-pressed={mode === 'calculator'}
              >
                Calculator
              </button>
              <button
                onClick={() => setMode('comparison')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                  mode === 'comparison'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-primary-light hover:text-white'
                }`}
                aria-pressed={mode === 'comparison'}
              >
                Compare Loans
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {mode === 'calculator' ? (
          <div className="space-y-8">
            {/* Input + Results */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Input Panel — 2 columns */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-ink mb-6 font-display">
                  Loan Details
                </h2>
                <InputPanel
                  values={values}
                  onChange={handleValuesChange}
                  tenureMode={tenureMode}
                  onTenureModeChange={setTenureMode}
                />
              </div>

              {/* Results — 3 columns */}
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <ResultSummary
                    emi={emi}
                    principal={values.principal}
                    annualRate={values.annualRate}
                    tenureMonths={tenureMonths}
                  />
                </div>

                {/* Burn-down chart */}
                {schedule && schedule.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <BurnDownChart schedule={schedule} tenureMode={tenureMode} />
                  </div>
                )}

                {/* PDF Export */}
                <div className="flex justify-end">
                  <PDFExport
                    mode="single"
                    loanData={loanData}
                    schedule={schedule}
                  />
                </div>
              </div>
            </div>

            {/* Amortization Table */}
            {schedule && schedule.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <AmortizationTable schedule={schedule} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <ComparisonMode onResultsChange={setComparisonResults} />
            <div className="flex justify-end">
              <PDFExport mode="comparison" comparisonResults={comparisonResults} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-muted">
          <p>
            EMI Formula: <span className="font-mono text-xs">EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]</span>
          </p>
          <p className="text-xs text-ink-faint">
            Portfolio project — Loan EMI Calculator
          </p>
        </div>
      </footer>
    </div>
  );
}
