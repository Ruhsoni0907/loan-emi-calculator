/**
 * EMI Calculation Engine — pure, framework-agnostic module.
 *
 * Formulas:
 *   EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]
 *   where P = principal, R = monthly rate, N = tenure in months.
 */

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Calculate the equated monthly installment (EMI).
 */
export function calculateEMI(principal, annualRatePercent, tenureMonths) {
  if (!isPositiveNumber(principal) || principal <= 0) return null;
  if (!isPositiveNumber(tenureMonths) || tenureMonths <= 0) return null;
  if (annualRatePercent < 0 || !Number.isFinite(annualRatePercent)) return null;

  const R = annualRatePercent / 12 / 100;
  const N = tenureMonths;
  const P = principal;

  if (R === 0) {
    return Math.round((P / N) * 100) / 100;
  }

  const factor = Math.pow(1 + R, N);
  const emi = (P * R * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Generate a month-by-month amortization schedule.
 * Last month is adjusted so closing balance is exactly 0.
 */
export function generateAmortizationSchedule(principal, annualRatePercent, tenureMonths) {
  if (!isPositiveNumber(principal) || principal <= 0) return null;
  if (!isPositiveNumber(tenureMonths) || tenureMonths <= 0) return null;
  if (annualRatePercent < 0 || !Number.isFinite(annualRatePercent)) return null;

  const R = annualRatePercent / 12 / 100;
  const emi = calculateEMI(principal, annualRatePercent, tenureMonths);
  if (emi === null) return null;

  const schedule = [];
  let balance = Math.round(principal * 100) / 100;

  for (let month = 1; month <= tenureMonths; month++) {
    const year = Math.ceil(month / 12);
    const opening = balance;
    const interestComponent = R === 0 ? 0 : Math.round(balance * R * 100) / 100;

    if (month === tenureMonths) {
      const principalComponent = Math.round(opening * 100) / 100;
      schedule.push({
        month,
        year,
        opening: Math.round(opening * 100) / 100,
        emi: Math.round((principalComponent + interestComponent) * 100) / 100,
        principalComponent,
        interestComponent,
        closing: 0,
      });
      break;
    }

    const principalComponent = Math.round((emi - interestComponent) * 100) / 100;
    balance = Math.round((balance - principalComponent) * 100) / 100;

    schedule.push({
      month,
      year,
      opening: Math.round(opening * 100) / 100,
      emi,
      principalComponent,
      interestComponent,
      closing: Math.max(0, balance),
    });
  }

  return schedule;
}

/**
 * Aggregate monthly schedule into yearly totals.
 */
export function aggregateYearly(schedule) {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;

  const yearly = [];
  let currentYear = null;
  let yearData = null;

  for (const row of schedule) {
    if (row.year !== currentYear) {
      if (yearData) yearly.push(yearData);
      currentYear = row.year;
      yearData = {
        year: currentYear,
        opening: row.opening,
        closing: row.closing,
        emi: 0,
        principalComponent: 0,
        interestComponent: 0,
        months: 0,
      };
    }
    yearData.emi += row.emi;
    yearData.principalComponent += row.principalComponent;
    yearData.interestComponent += row.interestComponent;
    yearData.closing = row.closing;
    yearData.months += 1;
  }

  if (yearData) yearly.push(yearData);

  return yearly.map((y) => ({
    ...y,
    emi: Math.round(y.emi * 100) / 100,
    principalComponent: Math.round(y.principalComponent * 100) / 100,
    interestComponent: Math.round(y.interestComponent * 100) / 100,
  }));
}

/**
 * Compare multiple loan scenarios.
 */
export function compareLoans(scenarios) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) return null;

  const results = scenarios.map((s) => {
    const emi = calculateEMI(s.principal, s.rate, s.tenureMonths);
    if (emi === null) return { ...s, emi: null, totalInterest: null, totalPayable: null };

    const totalPayable = Math.round(emi * s.tenureMonths * 100) / 100;
    const totalInterest = Math.round((totalPayable - s.principal) * 100) / 100;

    return { ...s, emi, totalInterest, totalPayable };
  });

  const validResults = results.filter((r) => r.totalInterest !== null);
  if (validResults.length === 0) return results;

  const bestIdx = validResults.reduce(
    (best, r, i) => (r.totalInterest < validResults[best].totalInterest ? i : best),
    0
  );

  return results.map((r, i) => {
    if (r.totalInterest === null) return { ...r, deltaInterest: null, deltaEmi: null };

    const best = validResults[bestIdx];
    const first = validResults[0];

    return {
      ...r,
      deltaInterest: Math.round((r.totalInterest - best.totalInterest) * 100) / 100,
      deltaEmi: Math.round((r.emi - best.emi) * 100) / 100,
      deltaInterestVsFirst: Math.round((r.totalInterest - first.totalInterest) * 100) / 100,
      deltaEmiVsFirst: Math.round((r.emi - first.emi) * 100) / 100,
      isBestInterest: i === bestIdx,
    };
  });
}

/**
 * Format currency in Indian notation.
 */
export function formatINR(amount, compact = false) {
  if (amount === null || amount === undefined) return '—';
  if (compact) {
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(1) + ' Cr';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + ' L';
    if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'K';
  }
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatINRExact(amount) {
  if (amount === null || amount === undefined) return '—';
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Validate loan inputs.
 */
export function validateInputs(principal, annualRate, tenureMonths) {
  const errors = {};
  if (!principal || principal <= 0) errors.principal = 'Enter a valid loan amount';
  else if (principal < 10000) errors.principal = 'Minimum loan amount is ₹10,000';
  else if (principal > 100000000) errors.principal = 'Maximum loan amount is ₹10 Crore';

  if (annualRate === undefined || annualRate === null || annualRate < 0) errors.annualRate = 'Enter a valid interest rate';
  else if (annualRate > 50) errors.annualRate = 'Rate seems too high (max 50%)';

  if (!tenureMonths || tenureMonths <= 0) errors.tenureMonths = 'Enter a valid tenure';
  else if (tenureMonths > 360) errors.tenureMonths = 'Maximum tenure is 30 years (360 months)';

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Preset loan templates.
 */
export const LOAN_PRESETS = [
  {
    id: 'home',
    name: 'Home Loan',
    icon: '🏠',
    description: 'Property purchase',
    principal: 5000000,
    rate: 8.5,
    tenureYears: 20,
    color: '#0A2540',
  },
  {
    id: 'car',
    name: 'Car Loan',
    icon: '🚗',
    description: 'Vehicle financing',
    principal: 800000,
    rate: 9.0,
    tenureYears: 5,
    color: '#00D4AA',
  },
  {
    id: 'education',
    name: 'Education Loan',
    icon: '🎓',
    description: 'Higher education',
    principal: 2000000,
    rate: 10.5,
    tenureYears: 10,
    color: '#7C4DFF',
  },
  {
    id: 'personal',
    name: 'Personal Loan',
    icon: '💰',
    description: 'Flexible usage',
    principal: 500000,
    rate: 12.0,
    tenureYears: 3,
    color: '#FF6B35',
  },
];

/**
 * Export schedule as CSV.
 */
export function exportScheduleCSV(schedule, filename = 'amortization-schedule.csv') {
  if (!schedule || schedule.length === 0) return;

  const headers = ['Month', 'Year', 'Opening Balance', 'EMI', 'Principal', 'Interest', 'Closing Balance'];
  const rows = schedule.map(r => [
    r.month,
    r.year,
    r.opening.toFixed(2),
    r.emi.toFixed(2),
    r.principalComponent.toFixed(2),
    r.interestComponent.toFixed(2),
    r.closing.toFixed(2),
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse URL search params into loan values.
 */
export function parseLoanFromURL() {
  const params = new URLSearchParams(window.location.search);
  const principal = parseFloat(params.get('p'));
  const rate = parseFloat(params.get('r'));
  const tenure = parseFloat(params.get('t'));
  const mode = params.get('m'); // 'years' or 'months'

  if (principal > 0 && rate >= 0 && tenure > 0) {
    return {
      principal,
      annualRate: rate,
      tenureYears: mode === 'months' ? Math.round(tenure / 12) : tenure,
      tenureMonths: mode === 'months' ? tenure : tenure * 12,
    };
  }
  return null;
}

/**
 * Generate shareable URL.
 */
export function generateShareURL(principal, annualRate, tenureMonths) {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    p: principal.toString(),
    r: annualRate.toString(),
    t: tenureMonths.toString(),
    m: 'months',
  });
  return `${base}?${params.toString()}`;
}
