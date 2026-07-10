import { useMemo } from 'react';
import { formatINR, formatINRExact } from '../lib/emiEngine.js';

/**
 * ResultSummary — Hero EMI display with supporting metrics and visual split.
 */
export default function ResultSummary({ emi, principal, annualRate, tenureMonths }) {
  const totals = useMemo(() => {
    if (!emi || emi === null) return null;
    const totalPayable = Math.round(emi * tenureMonths * 100) / 100;
    const totalInterest = Math.round((totalPayable - principal) * 100) / 100;
    const principalPct = Math.round((principal / totalPayable) * 100);
    const interestPct = 100 - principalPct;
    const monthlyInterestRate = annualRate / 12;
    return { totalPayable, totalInterest, principalPct, interestPct, monthlyInterestRate };
  }, [emi, principal, annualRate, tenureMonths]);

  if (!totals) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-cool flex items-center justify-center">
          <svg className="w-8 h-8 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
          </svg>
        </div>
        <p className="text-ink-muted text-lg font-medium">Enter loan details to calculate</p>
        <p className="text-ink-faint text-sm mt-1">Use the sliders or choose a preset</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero EMI */}
      <div className="text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent rounded-3xl -m-4 pointer-events-none" />
        <p className="text-xs font-bold text-accent uppercase tracking-[0.2em] mb-3 relative">
          Your Monthly EMI
        </p>
        <p className="font-mono text-5xl md:text-6xl font-bold text-primary tabular-nums leading-none relative">
          {formatINRExact(emi)}
        </p>
        <p className="text-xs text-ink-faint mt-3 font-mono relative">
          for {tenureMonths >= 12 ? `${Math.floor(tenureMonths / 12)} yr ${tenureMonths % 12 ? `${tenureMonths % 12} mo` : ''}` : `${tenureMonths} months`}
          {' '}at {annualRate}% p.a.
        </p>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Principal"
          value={formatINR(principal, true)}
          sublabel={`${totals.principalPct}% of total`}
          color="primary"
        />
        <MetricCard
          label="Total Interest"
          value={formatINR(totals.totalInterest, true)}
          sublabel={`${totals.interestPct}% of total`}
          color="accent"
        />
        <MetricCard
          label="Total Payable"
          value={formatINR(totals.totalPayable, true)}
          sublabel="Principal + Interest"
          color="ink"
        />
      </div>

      {/* Principal vs Interest visual */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-ink-faint uppercase tracking-wider">
            Cost Breakdown
          </p>
          <p className="text-xs font-mono text-ink-faint">
            {totals.principalPct}% / {totals.interestPct}%
          </p>
        </div>

        {/* Visual bar */}
        <div className="relative h-10 bg-surface-cool rounded-xl overflow-hidden flex border border-border">
          <div
            className="bg-gradient-to-r from-primary to-primary-light transition-all duration-700 ease-out flex items-center justify-center"
            style={{ width: `${totals.principalPct}%` }}
          >
            {totals.principalPct > 15 && (
              <span className="text-[10px] font-bold text-white drop-shadow-sm">
                {formatINR(principal, true)}
              </span>
            )}
          </div>
          <div
            className="bg-gradient-to-r from-accent-warm to-[#FF8F5E] transition-all duration-700 ease-out flex items-center justify-center"
            style={{ width: `${totals.interestPct}%` }}
          >
            {totals.interestPct > 15 && (
              <span className="text-[10px] font-bold text-white drop-shadow-sm">
                {formatINR(totals.totalInterest, true)}
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-between text-xs">
          <span className="flex items-center gap-2 font-medium text-ink">
            <span className="w-3 h-3 rounded-sm bg-primary inline-block" />
            Principal
          </span>
          <span className="flex items-center gap-2 font-medium text-ink">
            Interest
            <span className="w-3 h-3 rounded-sm bg-accent-warm inline-block" />
          </span>
        </div>
      </div>

      {/* Quick insight */}
      <div className="bg-surface-cool rounded-xl p-4 border border-border">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">
              You'll pay {formatINR(totals.totalInterest, true)} in interest
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              That's {totals.interestPct}% on top of your {formatINR(principal, true)} loan — roughly {formatINR(Math.round(totals.totalInterest / (tenureMonths / 12)), true)} per year.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sublabel, color }) {
  const colorClasses = {
    primary: 'bg-primary/5 border-primary/10',
    accent: 'bg-accent/5 border-accent/10',
    ink: 'bg-surface-cool border-border',
  };

  const textColorClasses = {
    primary: 'text-primary',
    accent: 'text-accent-warm',
    ink: 'text-ink',
  };

  return (
    <div className={`rounded-xl p-3 border text-center ${colorClasses[color]}`}>
      <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-mono text-lg font-bold tabular-nums ${textColorClasses[color]}`}>{value}</p>
      <p className="text-[10px] text-ink-faint mt-0.5">{sublabel}</p>
    </div>
  );
}
