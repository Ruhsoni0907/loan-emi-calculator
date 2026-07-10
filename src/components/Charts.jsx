import { useRef, useEffect, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { formatINR } from '../lib/emiEngine.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const COLORS = ['#635BFF', '#FF6B35', '#00D4AA', '#E53935', '#7C4DFF', '#FFB300'];

/**
 * Charts — All visualizations: doughnut, bar, line, balance chart.
 */
export default function Charts({ details }) {
  if (!details) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DoughnutChart details={details} />
        <BalanceChart details={details} />
      </div>
      <PaymentTimeline details={details} />
    </div>
  );
}

function DoughnutChart({ details }) {
  const data = {
    labels: ['Principal', 'Interest'],
    datasets: [{
      data: [details.effectivePrincipal, details.totalInterest],
      backgroundColor: ['#635BFF', '#FF6B35'],
      borderWidth: 0,
      borderRadius: 4,
      spacing: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'JetBrains Mono', size: 11 },
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (ctx) => ' ' + ctx.label + ': ' + formatINR(ctx.raw, true),
        },
      },
    },
  };

  return (
    <div className="glass-card-static p-6">
      <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-faint)' }}>Principal vs Interest</h4>
      <div className="relative max-w-[220px] mx-auto">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>Split</p>
          <p className="font-mono text-lg font-bold" style={{ color: 'var(--text)' }}>{details.principalPct}% / {details.interestPct}%</p>
        </div>
      </div>
      <div className="flex justify-center gap-6 mt-4">
        <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded" style={{ background: '#635BFF' }} /> Principal
        </span>
        <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded" style={{ background: '#FF6B35' }} /> Interest
        </span>
      </div>
    </div>
  );
}

function BalanceChart({ details }) {
  // Sample schedule for chart
  const sample = useMemo(() => {
    const s = details.schedule;
    const rate = s.length > 36 ? 6 : s.length > 12 ? 3 : 1;
    return s.filter((_, i) => i % rate === 0 || i === s.length - 1);
  }, [details.schedule]);

  const data = {
    labels: sample.map(r => 'M' + r.month),
    datasets: [
      {
        label: 'Balance',
        data: sample.map(r => r.closing),
        borderColor: '#635BFF',
        backgroundColor: 'rgba(99,91,255,0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Cum. Interest',
        data: sample.map(r => r.totalInterestPaid),
        borderColor: '#FF6B35',
        backgroundColor: 'rgba(255,107,53,0.05)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleFont: { family: 'Inter', size: 11 },
        bodyFont: { family: 'JetBrains Mono', size: 10 },
        padding: 10,
        cornerRadius: 10,
        callbacks: { label: (ctx) => ' ' + ctx.dataset.label + ': ' + formatINR(ctx.raw, true) },
      },
    },
    scales: {
      x: { display: false },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#90A4AE', callback: v => formatINR(v, true) },
      },
    },
  };

  return (
    <div className="glass-card-static p-6">
      <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-faint)' }}>Balance & Interest Burn-Down</h4>
      <Line data={data} options={options} />
      <div className="flex justify-center gap-6 mt-3">
        <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded" style={{ background: '#635BFF' }} /> Outstanding
        </span>
        <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded" style={{ background: '#FF6B35' }} /> Cum. Interest
        </span>
      </div>
    </div>
  );
}

function PaymentTimeline({ details }) {
  const data = {
    labels: details.yearly.map(y => 'Y' + y.year),
    datasets: [
      {
        label: 'Principal',
        data: details.yearly.map(y => y.principal),
        backgroundColor: '#635BFF',
        borderRadius: 6,
      },
      {
        label: 'Interest',
        data: details.yearly.map(y => y.interest),
        backgroundColor: '#FF6B35',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleFont: { family: 'Inter', size: 11 },
        bodyFont: { family: 'JetBrains Mono', size: 10 },
        padding: 10,
        cornerRadius: 10,
        callbacks: { label: (ctx) => ' ' + ctx.dataset.label + ': ' + formatINR(ctx.raw, true) },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#90A4AE' } },
      y: {
        stacked: true,
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#90A4AE', callback: v => formatINR(v, true) },
      },
    },
  };

  return (
    <div className="glass-card-static p-6">
      <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-faint)' }}>Payment Timeline</h4>
      <Bar data={data} options={options} />
      <div className="flex justify-center gap-6 mt-3">
        <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded" style={{ background: '#635BFF' }} /> Principal
        </span>
        <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-3 h-3 rounded" style={{ background: '#FF6B35' }} /> Interest
        </span>
      </div>
    </div>
  );
}
