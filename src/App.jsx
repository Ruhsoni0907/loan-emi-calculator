import { useState, useMemo, useCallback, useEffect } from 'react';
import InputPanel from './components/InputPanel.jsx';
import ResultSummary from './components/ResultSummary.jsx';
import BurnDownChart from './components/BurnDownChart.jsx';
import AmortizationTable from './components/AmortizationTable.jsx';
import ComparisonMode from './components/ComparisonMode.jsx';
import PDFExport from './components/PDFExport.jsx';
import {
  calculateEMI,
  generateAmortizationSchedule,
  parseLoanFromURL,
  generateShareURL,
  formatINR,
} from './lib/emiEngine.js';

/**
 * App — Root component for the Loan EMI Calculator.
 */
export default function App() {
  const [mode, setMode] = useState('calculator');
  const [tenureMode, setTenureMode] = useState('years');
  const [comparisonResults, setComparisonResults] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);

  // Initialize from URL params or defaults
  const [values, setValues] = useState(() => {
    const fromURL = parseLoanFromURL();
    if (fromURL) {
      return {
        principal: fromURL.principal,
        annualRate: fromURL.annualRate,
        tenureYears: fromURL.tenureYears,
        tenureMonths: fromURL.tenureMonths,
      };
    }
    return {
      principal: 1000000,
      annualRate: 8.5,
      tenureYears: 10,
      tenureMonths: 120,
    };
  });

  // Sync tenure mode from URL
  useEffect(() => {
    const fromURL = parseLoanFromURL();
    if (fromURL && window.location.search.includes('m=months')) {
      setTenureMode('months');
    }
  }, []);

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

  const handleShare = useCallback(() => {
    const url = generateShareURL(values.principal, values.annualRate, tenureMonths);
    navigator.clipboard.writeText(url).then(() => {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    });
  }, [values.principal, values.annualRate, tenureMonths]);

  return (
    <div className="min-h-screen bg-surface-cool">
      {/* Header */}
      <header className="bg-primary text-white relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  EMI Calculator
                </h1>
                <p className="text-white/50 text-xs">
                  Loan planning, made clear
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mode switcher */}
              <div className="flex items-center gap-0.5 bg-white/10 rounded-xl p-1 backdrop-blur-sm">
                <button
                  onClick={() => setMode('calculator')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    mode === 'calculator'
                      ? 'bg-white text-primary shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Calculator
                </button>
                <button
                  onClick={() => setMode('comparison')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    mode === 'comparison'
                      ? 'bg-white text-primary shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Compare
                </button>
              </div>

              {/* Share button (calculator mode only) */}
              {mode === 'calculator' && (
                <button
                  onClick={handleShare}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm relative"
                  title="Copy shareable link"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {showShareToast && (
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white text-ink text-[10px] font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fade-in z-50">
                      Link copied!
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Accent bottom border */}
        <div className="h-1 bg-gradient-to-r from-accent via-accent-warm to-accent" />
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mode === 'calculator' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Input Panel */}
              <div className="lg:col-span-4 order-2 lg:order-1">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-border sticky top-8">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-5 bg-accent rounded-full" />
                    <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
                      Loan Details
                    </h2>
                  </div>
                  <InputPanel
                    values={values}
                    onChange={handleValuesChange}
                    tenureMode={tenureMode}
                    onTenureModeChange={setTenureMode}
                  />
                </div>
              </div>

              {/* Results Column */}
              <div className="lg:col-span-8 order-1 lg:order-2 space-y-6">
                {/* Hero EMI + Chart */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-border">
                  <ResultSummary
                    emi={emi}
                    principal={values.principal}
                    annualRate={values.annualRate}
                    tenureMonths={tenureMonths}
                  />
                </div>

                {/* Burn-down chart */}
                {schedule && schedule.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
                    <BurnDownChart schedule={schedule} />
                  </div>
                )}

                {/* Export */}
                <div className="flex justify-end gap-3">
                  <PDFExport mode="single" loanData={loanData} schedule={schedule} />
                </div>
              </div>
            </div>

            {/* Amortization Table */}
            {schedule && schedule.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
                <AmortizationTable schedule={schedule} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Comparison header */}
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-ink mb-2">
                Loan Comparison
              </h2>
              <p className="text-sm text-ink-muted">
                Configure 2–3 scenarios side by side to find the best deal. Adjust rates, tenures, and amounts to see how they compare.
              </p>
            </div>

            <ComparisonMode onResultsChange={setComparisonResults} />

            <div className="flex justify-center">
              <PDFExport mode="comparison" comparisonResults={comparisonResults} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-faint">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink-muted">EMI Formula:</span>
              <code className="font-mono text-[10px] bg-surface-cool px-2 py-1 rounded border border-border">
                EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]
              </code>
            </div>
            <p className="text-[10px]">
              Built with React, Tailwind CSS, Recharts & jsPDF
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
