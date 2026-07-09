/**
 * EMI Calculation Engine — pure, framework-agnostic module.
 *
 * Formulas used:
 *   EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]
 *   where P = principal, R = monthly rate, N = tenure in months.
 *
 * All monetary values are rounded to 2 decimal places at the output level.
 * Intermediate calculations use full floating-point precision.
 */

/**
 * Validate that a number is a finite, positive value.
 * @param {*} value
 * @returns {boolean}
 */
function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Calculate the equated monthly installment (EMI).
 *
 * @param {number} principal        – Loan amount (> 0)
 * @param {number} annualRatePercent – Annual interest rate in % (>= 0)
 * @param {number} tenureMonths     – Loan tenure in months (> 0)
 * @returns {number|null} EMI amount rounded to 2 dp, or null on invalid input
 */
export function calculateEMI(principal, annualRatePercent, tenureMonths) {
  if (!isPositiveNumber(principal) || principal <= 0) return null;
  if (!isPositiveNumber(tenureMonths) || tenureMonths <= 0) return null;
  if (annualRatePercent < 0 || !Number.isFinite(annualRatePercent)) return null;

  const R = annualRatePercent / 12 / 100;
  const N = tenureMonths;
  const P = principal;

  // Handle 0% interest: simple division
  if (R === 0) {
    return Math.round((P / N) * 100) / 100;
  }

  const factor = Math.pow(1 + R, N);
  const emi = (P * R * factor) / (factor - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Generate a month-by-month amortization schedule.
 *
 * The last month's interest is adjusted so the closing balance is exactly 0,
 * preventing rounding drift.
 *
 * @param {number} principal
 * @param {number} annualRatePercent
 * @param {number} tenureMonths
 * @returns {Array<Object>|null} Array of { month, year, opening, emi,
 *   principalComponent, interestComponent, closing } or null on invalid input
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

    // Last month: adjust to close out exactly
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
 * Aggregate a monthly schedule into yearly totals.
 *
 * @param {Array<Object>} schedule – Output of generateAmortizationSchedule
 * @returns {Array<Object>|null} Array of { year, opening, closing, emi,
 *   principalComponent, interestComponent, months } or null on invalid input
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

  // Round aggregated values
  return yearly.map((y) => ({
    ...y,
    emi: Math.round(y.emi * 100) / 100,
    principalComponent: Math.round(y.principalComponent * 100) / 100,
    interestComponent: Math.round(y.interestComponent * 100) / 100,
  }));
}

/**
 * Compare multiple loan scenarios.
 *
 * @param {Array<Object>} scenarios – Array of { principal, rate, tenureMonths, label }
 * @returns {Array<Object>|null} Each entry gains: emi, totalInterest, totalPayable,
 *   deltaInterest (vs best), deltaEmi (vs best), deltaInterestVsFirst, deltaEmiVsFirst
 */
export function compareLoans(scenarios) {
  if (!Array.isArray(scenarios) || scenarios.length === 0) return null;

  const results = scenarios.map((s) => {
    const emi = calculateEMI(s.principal, s.rate, s.tenureMonths);
    if (emi === null) return { ...s, emi: null, totalInterest: null, totalPayable: null };

    const totalPayable = Math.round(emi * s.tenureMonths * 100) / 100;
    const totalInterest = Math.round((totalPayable - s.principal) * 100) / 100;

    return {
      ...s,
      emi,
      totalInterest,
      totalPayable,
    };
  });

  // Find the scenario with lowest total interest for delta reference
  const validResults = results.filter((r) => r.totalInterest !== null);
  if (validResults.length === 0) return results;

  const bestIdx = validResults.reduce(
    (best, r, i) => (r.totalInterest < validResults[best].totalInterest ? i : best),
    0
  );
  const firstIdx = 0;

  return results.map((r, i) => {
    if (r.totalInterest === null) return { ...r, deltaInterest: null, deltaEmi: null };

    const best = validResults[bestIdx];
    const first = validResults[firstIdx];

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
