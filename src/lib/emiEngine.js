/**
 * EMI Calculation Engine v2 — comprehensive, framework-agnostic module.
 *
 * Supports: standard EMI, processing fees, down payments, extra payments, multiple frequencies.
 */

function isPositiveNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

const FREQUENCY_MAP = { monthly: 12, quarterly: 4, 'half-yearly': 2, yearly: 1 };

/**
 * Core EMI calculation.
 */
export function calculateEMI(principal, annualRatePercent, tenureMonths) {
  if (!isPositiveNumber(principal) || principal <= 0) return null;
  if (!isPositiveNumber(tenureMonths) || tenureMonths <= 0) return null;
  if (annualRatePercent < 0 || !Number.isFinite(annualRatePercent)) return null;

  const R = annualRatePercent / 12 / 100;
  const N = tenureMonths;
  const P = principal;

  if (R === 0) return Math.round((P / N) * 100) / 100;

  const factor = Math.pow(1 + R, N);
  return Math.round((P * R * factor) / (factor - 1) * 100) / 100;
}

/**
 * Generate full amortization schedule with optional extra payments.
 */
export function generateSchedule(principal, annualRate, tenureMonths, extraPayment = 0) {
  if (!isPositiveNumber(principal) || !isPositiveNumber(tenureMonths)) return null;
  if (annualRate < 0 || !Number.isFinite(annualRate)) return null;

  const R = annualRate / 12 / 100;
  const baseEMI = calculateEMI(principal, annualRate, tenureMonths);
  if (!baseEMI) return null;

  const schedule = [];
  let balance = Math.round(principal * 100) / 100;
  let totalInterestPaid = 0;
  let month = 0;

  while (balance > 0 && month < tenureMonths + 120) {
    month++;
    const year = Math.ceil(month / 12);
    const opening = balance;
    const interest = R === 0 ? 0 : Math.round(balance * R * 100) / 100;
    totalInterestPaid = Math.round((totalInterestPaid + interest) * 100) / 100;

    const actualEMI = month <= tenureMonths ? baseEMI : balance + interest;
    const extra = month <= tenureMonths ? extraPayment : 0;
    const totalPayment = actualEMI + extra;

    let principalPart = Math.round((totalPayment - interest) * 100) / 100;
    if (principalPart > balance) principalPart = balance;

    balance = Math.round((balance - principalPart) * 100) / 100;
    if (balance < 0) balance = 0;

    schedule.push({
      month, year,
      opening: Math.round(opening * 100) / 100,
      emi: Math.round(actualEMI * 100) / 100,
      extra,
      interest,
      principalComponent: Math.round(principalPart * 100) / 100,
      closing: balance,
      totalInterestPaid,
    });

    if (balance === 0) break;
  }

  return schedule;
}

/**
 * Calculate full loan details including processing fee, GST, down payment.
 */
export function calculateLoanDetails({
  principal, annualRate, tenureMonths, frequency = 'monthly',
  processingFeePct = 0, gstPct = 18, downPayment = 0, extraPayment = 0,
}) {
  if (!isPositiveNumber(principal) || !isPositiveNumber(tenureMonths)) return null;

  const effectivePrincipal = principal - downPayment;
  if (effectivePrincipal <= 0) return null;

  const frequencyDivisor = FREQUENCY_MAP[frequency] || 12;
  const periodsPerYear = frequencyDivisor;
  const totalPeriods = Math.round(tenureMonths / 12 * periodsPerYear);
  const ratePerPeriod = annualRate / periodsPerYear / 100;

  // EMI based on effective principal
  let emi;
  if (ratePerPeriod === 0) {
    emi = effectivePrincipal / totalPeriods;
  } else {
    const factor = Math.pow(1 + ratePerPeriod, totalPeriods);
    emi = (effectivePrincipal * ratePerPeriod * factor) / (factor - 1);
  }
  emi = Math.round(emi * 100) / 100;

  const processingFee = Math.round(principal * processingFeePct / 100 * 100) / 100;
  const gstOnFee = Math.round(processingFee * gstPct / 100 * 100) / 100;
  const totalFee = Math.round((processingFee + gstOnFee) * 100) / 100;

  // Monthly schedule (always compute monthly for charting)
  const schedule = generateSchedule(effectivePrincipal, annualRate, tenureMonths, extraPayment);
  if (!schedule) return null;

  const totalPayable = schedule.reduce((sum, r) => sum + r.emi + r.extra, 0);
  const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0);
  const totalWithFee = totalPayable + totalFee + downPayment;

  // Yearly aggregation
  const yearly = [];
  let currentYear = null;
  let yearData = null;
  for (const row of schedule) {
    if (row.year !== currentYear) {
      if (yearData) yearly.push(yearData);
      currentYear = row.year;
      yearData = { year: currentYear, opening: row.opening, closing: row.closing, emi: 0, interest: 0, principal: 0, extra: 0, months: 0 };
    }
    yearData.emi += row.emi;
    yearData.interest += row.interest;
    yearData.principal += row.principalComponent;
    yearData.extra += row.extra;
    yearData.closing = row.closing;
    yearData.months++;
  }
  if (yearData) yearly.push(yearData);

  return {
    emi,
    effectivePrincipal,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalPayableWithFee: Math.round(totalWithFee * 100) / 100,
    processingFee,
    gstOnFee,
    totalFee,
    downPayment,
    extraPayment,
    principalPct: Math.round(effectivePrincipal / totalPayable * 100),
    interestPct: Math.round(totalInterest / totalPayable * 100),
    totalMonths: schedule.length,
    effectiveMonthlyRate: Math.round(annualRate / 12 * 100) / 100,
    schedule,
    yearly: yearly.map(y => ({
      ...y,
      emi: Math.round(y.emi * 100) / 100,
      interest: Math.round(y.interest * 100) / 100,
      principal: Math.round(y.principal * 100) / 100,
      extra: Math.round(y.extra * 100) / 100,
    })),
  };
}

/**
 * Compare multiple loan scenarios.
 */
export function compareLoans(scenarios) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) return null;

  const results = scenarios.map(s => {
    const details = calculateLoanDetails({
      principal: s.principal,
      annualRate: s.rate,
      tenureMonths: s.tenureMonths,
      processingFeePct: s.processingFeePct || 0,
      downPayment: s.downPayment || 0,
      extraPayment: s.extraPayment || 0,
    });
    return { ...s, details };
  });

  const valid = results.filter(r => r.details);
  if (valid.length === 0) return results;

  const bestIdx = valid.reduce((best, r, i) =>
    r.details.totalInterest < valid[best].details.totalInterest ? i : best, 0);

  return results.map((r, i) => {
    if (!r.details) return { ...r, delta: null };
    const best = valid[bestIdx];
    const first = valid[0];
    return {
      ...r,
      delta: {
        vsBest: {
          interest: Math.round((r.details.totalInterest - best.details.totalInterest) * 100) / 100,
          emi: Math.round((r.details.emi - best.details.emi) * 100) / 100,
        },
        vsFirst: {
          interest: Math.round((r.details.totalInterest - first.details.totalInterest) * 100) / 100,
          emi: Math.round((r.details.emi - first.details.emi) * 100) / 100,
        },
        isBest: i === bestIdx,
      },
    };
  });
}

/**
 * Format currency in Indian notation.
 */
export function formatINR(amount, compact = false) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  if (compact) {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(1) + ' Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + ' L';
    if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'K';
  }
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatINRExact(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Validate inputs.
 */
export function validateInputs(principal, annualRate, tenureMonths) {
  const errors = {};
  if (!principal || principal <= 0) errors.principal = 'Enter a valid loan amount';
  else if (principal < 10000) errors.principal = 'Minimum is ₹10,000';
  else if (principal > 100000000) errors.principal = 'Maximum is ₹10 Crore';
  if (annualRate === undefined || annualRate === null || annualRate < 0) errors.annualRate = 'Enter a valid rate';
  else if (annualRate > 50) errors.annualRate = 'Max 50%';
  if (!tenureMonths || tenureMonths <= 0) errors.tenureMonths = 'Enter valid tenure';
  else if (tenureMonths > 360) errors.tenureMonths = 'Max 30 years';
  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Preset loan templates.
 */
export const PRESETS = [
  { id: 'home', name: 'Home Loan', icon: '🏠', principal: 5000000, rate: 8.5, tenure: 20, color: '#635BFF' },
  { id: 'car', name: 'Car Loan', icon: '🚗', principal: 800000, rate: 9.0, tenure: 5, color: '#00D4AA' },
  { id: 'edu', name: 'Education', icon: '🎓', principal: 2000000, rate: 10.5, tenure: 10, color: '#7C4DFF' },
  { id: 'personal', name: 'Personal', icon: '💰', principal: 500000, rate: 12.0, tenure: 3, color: '#FF6B35' },
];

/**
 * CSV export.
 */
export function exportCSV(schedule, filename = 'amortization.csv') {
  if (!schedule?.length) return;
  const headers = ['Month','Year','Opening','EMI','Extra','Interest','Principal','Closing'];
  const rows = schedule.map(r => [r.month,r.year,r.opening,r.emi,r.extra,r.interest,r.principalComponent,r.closing]);
  const csv = [headers,...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/**
 * URL share/parse.
 */
export function generateShareURL(params) {
  const base = window.location.origin + window.location.pathname;
  const p = new URLSearchParams({
    p: params.principal, r: params.annualRate, t: params.tenureMonths,
    pf: params.processingFeePct || 0, dp: params.downPayment || 0, ep: params.extraPayment || 0,
  });
  return base + '?' + p.toString();
}

export function parseURL() {
  const p = new URLSearchParams(window.location.search);
  const principal = parseFloat(p.get('p'));
  const rate = parseFloat(p.get('r'));
  const tenure = parseFloat(p.get('t'));
  if (principal > 0 && rate >= 0 && tenure > 0) {
    return {
      principal, annualRate: rate, tenureMonths: tenure,
      processingFeePct: parseFloat(p.get('pf')) || 0,
      downPayment: parseFloat(p.get('dp')) || 0,
      extraPayment: parseFloat(p.get('ep')) || 0,
    };
  }
  return null;
}

/**
 * LocalStorage helpers.
 */
const STORAGE_KEY = 'emi_calc_scenarios';
export function saveScenarios(scenarios) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios)); } catch {}
}
export function loadScenarios() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
