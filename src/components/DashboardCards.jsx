import AnimatedNumber from './AnimatedNumber.jsx';

/**
 * DashboardCards — Animated stat cards showing key loan metrics.
 */
export default function DashboardCards({ details }) {
  if (!details) return null;

  const cards = [
    { label: 'Monthly EMI', value: details.emi, prefix: '₹', color: '#635BFF', decimals: 0 },
    { label: 'Total Interest', value: details.totalInterest, prefix: '₹', color: '#FF6B35', decimals: 0, compact: true },
    { label: 'Principal', value: details.effectivePrincipal, prefix: '₹', color: '#00D4AA', decimals: 0, compact: true },
    { label: 'Processing Fee', value: details.totalFee, prefix: '₹', color: '#E53935', decimals: 0 },
    { label: 'Total Payment', value: details.totalPayable, prefix: '₹', color: '#635BFF', decimals: 0, compact: true },
    { label: 'Total Months', value: details.totalMonths, color: '#546E7A', decimals: 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {cards.map((card, i) => (
        <div key={i} className="stat-card glass-card-static p-4" style={{ animationDelay: i * 0.05 + 's' }}>
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: card.color }} />
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>{card.label}</p>
          <p className="text-xl font-bold font-mono tabular-nums" style={{ color: card.color }}>
            <AnimatedNumber value={card.value} prefix={card.prefix || ''} decimals={card.decimals} />
          </p>
        </div>
      ))}
    </div>
  );
}
