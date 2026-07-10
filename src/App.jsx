import { useState, useMemo, useCallback, useEffect } from 'react';
import InputPanel from './components/InputPanel.jsx';
import DashboardCards from './components/DashboardCards.jsx';
import Charts from './components/Charts.jsx';
import AmortizationTable from './components/AmortizationTable.jsx';
import ComparisonMode from './components/ComparisonMode.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import ToastContainer, { showToast } from './components/Toast.jsx';
import { calculateLoanDetails, formatINR, formatINRExact, generateShareURL, parseURL } from './lib/emiEngine.js';

export default function App() {
  const [mode, setMode] = useState('calculator');
  const [values, setValues] = useState(() => {
    const fromURL = parseURL();
    if (fromURL) return { ...fromURL, tenureMode: 'months', tenureYears: Math.round(fromURL.tenureMonths / 12), frequency: 'monthly', processingFeePct: fromURL.processingFeePct || 1, gstPct: 18, downPayment: fromURL.downPayment || 0, extraPayment: fromURL.extraPayment || 0 };
    return {
      principal: 1000000, annualRate: 8.5, tenureYears: 10, tenureMonths: 120,
      tenureMode: 'years', frequency: 'monthly', processingFeePct: 1, gstPct: 18,
      downPayment: 0, extraPayment: 0,
    };
  });

  // Auto-save to localStorage
  useEffect(() => {
    try { localStorage.setItem('emi_calc_values', JSON.stringify(values)); } catch {}
  }, [values]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigator.clipboard?.writeText(generateShareURL(values));
        showToast('Link copied to clipboard!');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleReset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [values]);

  const details = useMemo(() => calculateLoanDetails(values), [values]);

  const handleValuesChange = useCallback((next) => {
    setValues(next);
  }, []);

  const handleReset = useCallback(() => {
    setValues({
      principal: 1000000, annualRate: 8.5, tenureYears: 10, tenureMonths: 120,
      tenureMode: 'years', frequency: 'monthly', processingFeePct: 1, gstPct: 18,
      downPayment: 0, extraPayment: 0,
    });
    showToast('Calculator reset');
  }, []);

  const handleShare = useCallback(() => {
    const url = generateShareURL(values);
    navigator.clipboard?.writeText(url).then(() => {
      showToast('Shareable link copied!');
    }).catch(() => {
      showToast('Could not copy link', 'error');
    });
  }, [values]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s' }}>
      <ToastContainer />

      {/* Header */}
      <header style={{ background: 'var(--gradient-primary)', position: 'relative', overflow: 'hidden' }}>
        {/* Animated background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #635BFF 0%, #7A73FF 30%, #00D4AA 70%, #635BFF 100%)', backgroundSize: '200% 200%', animation: 'gradientShift 8s ease infinite', opacity: 0.95 }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">EMI Calculator</h1>
                <p className="text-white/60 text-xs">Professional Loan Planning Tool</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mode tabs */}
              <div className="flex rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm p-0.5">
                {[{id:'calculator',label:'Calculator'},{id:'comparison',label:'Compare'}].map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200"
                    style={{ background: mode === m.id ? 'white' : 'transparent', color: mode === m.id ? '#635BFF' : 'rgba(255,255,255,0.6)' }}>
                    {m.label}
                  </button>
                ))}
              </div>
              <button onClick={handleShare}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-all backdrop-blur-sm"
                title="Share (Ctrl+K)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mode === 'calculator' ? (
          <div className="space-y-6 animate-fade-in">
            {/* Dashboard cards */}
            <DashboardCards details={details} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Input panel */}
              <div className="lg:col-span-4 order-2 lg:order-1">
                <div className="glass-card p-6 sticky top-8">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1 h-5 rounded-full" style={{ background: '#635BFF' }} />
                    <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>Loan Details</h2>
                  </div>
                  <InputPanel values={values} onChange={handleValuesChange} />
                </div>
              </div>

              {/* Charts & results */}
              <div className="lg:col-span-8 order-1 lg:order-2 space-y-6">
                {/* EMI Hero */}
                {details && (
                  <div className="glass-card p-8 text-center" style={{ background: 'var(--gradient-primary)', position: 'relative', overflow: 'hidden' }}>
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #635BFF 0%, #7A73FF 30%, #00D4AA 70%, #635BFF 100%)', backgroundSize: '200% 200%', animation: 'gradientShift 8s ease infinite', opacity: 0.9 }} />
                    <div className="relative">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-2">Monthly EMI</p>
                      <p className="font-mono text-4xl sm:text-5xl font-bold text-white tabular-nums leading-none">
                        {formatINRExact(details.emi)}
                      </p>
                      <p className="text-xs text-white/50 mt-3">
                        {details.totalMonths} months · {values.annualRate}% p.a. · {values.frequency}
                      </p>
                      <div className="flex justify-center gap-6 mt-4">
                        <span className="text-xs text-white/70">Interest: {formatINR(details.totalInterest, true)}</span>
                        <span className="text-xs text-white/70">Total: {formatINR(details.totalPayable, true)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Charts */}
                <Charts details={details} />

                {/* Amortization */}
                <AmortizationTable details={details} />
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Loan Comparison</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure 2–3 scenarios side by side. Auto-saved to your browser.</p>
            </div>
            <ComparisonMode />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--card-border)', background: 'var(--card)', marginTop: 48 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--text-faint)' }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>EMI Formula:</span>
            <code className="font-mono px-2 py-1 rounded" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', fontSize: 10 }}>
              EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]
            </code>
          </div>
          <p className="text-[10px]">Keyboard: Ctrl+K share · Ctrl+R reset</p>
        </div>
      </footer>
    </div>
  );
}
