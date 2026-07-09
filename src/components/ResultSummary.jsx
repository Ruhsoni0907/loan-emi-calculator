import { useMemo } from 'react';

/**
 * ResultSummary — Hero EMI display with supporting metrics and principal-vs-interest split.
 *
 * The EMI is the clear visual focal point: large, bold, monospace.
 * Supporting data sits below in a clean grid.
 */
export default function ResultSummary({ emi, principal, annualRate, tenureMonths }) {
  const totals = useMemo(() => {
    if (!emi || emi === null) return null;
    const totalPayable = Math.round(emi * tenureMonths * 100) / 100;
    const totalInterest = Math.round((totalPayable - principal) * 100) / 100;
    const principalPct = Math.round((principal / totalPayable) * 100);
    const interestPct = 100 - principalPct;
    return { totalPayable, totalInterest, principalPct, interestPct };
  }, [emi, principal, tenureMonths]);

  if (!totals) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-muted text-lg">Enter valid loan details to see results</p>
      </div>
    );
  }

  const fmt = (v) => '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtExact = (v) => '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Hero EMI */}
      <div className="text-center">
        <p className="text-sm font-medium text-ink-muted uppercase tracking-wider mb-2">
          Monthly EMI
        </p>
        <p className="font-mono text-5xl md:text-6xl font-bold text-primary tabular-nums leading-tight">
          {fmtExact(emi)}
        </p>
      </div>

      {/* Supporting metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-cool rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
            Total Interest
          </p>
          <p className="font-mono text-xl font-semibold text-accent-dark tabular-nums">
            {fmt(totals.totalInterest)}
          </p>
        </div>
        <div className="bg-surface-cool rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
            Total Payable
          </p>
          <p className="font-mono text-xl font-semibold text-ink tabular-nums">
            {fmt(totals.totalPayable)}
          </p>
        </div>
      </div>

      {/* Principal vs Interest split bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
          <span>Principal vs Interest</span>
          <span className="font-mono">{totals.principalPct}% / {totals.interestPct}%</span>
        </div>
        <div className="h-3 bg-primary/20 rounded-full overflow-hidden flex">
          <div
            className="bg-primary transition-all duration-500 ease-out"
            style={{ width: `${totals.principalPct}%` }}
            role="progressbar"
            aria-valuenow={totals.principalPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Principal: ${totals.principalPct}%`}
          />
          <div
            className="bg-accent transition-all duration-500 ease-out"
            style={{ width: `${totals.interestPct}%` }}
            role="progressbar"
            aria-valuenow={totals.interestPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Interest: ${totals.interestPct}%`}
          />
        </div>
        <div className="flex justify-between text-xs font-mono text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Principal {fmt(principal)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            Interest {fmt(totals.totalInterest)}
          </span>
        </div>
      </div>
    </div>
  );
}
