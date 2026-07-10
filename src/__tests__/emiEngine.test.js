import { describe, it, expect } from 'vitest';
import { calculateEMI, generateSchedule, calculateLoanDetails, compareLoans, formatINR, validateInputs } from '../lib/emiEngine.js';

describe('calculateEMI', () => {
  it('standard loan', () => { expect(calculateEMI(100000, 12, 12)).toBeCloseTo(8884.88, 0); });
  it('0% interest', () => { expect(calculateEMI(120000, 0, 12)).toBe(10000); });
  it('single month', () => { expect(calculateEMI(100000, 12, 1)).toBe(101000); });
  it('30yr tenure', () => { const e = calculateEMI(5000000, 8.5, 360); expect(e).toBeGreaterThan(0); expect(e).toBeLessThan(5000000); });
  it('null on bad input', () => { expect(calculateEMI(-1, 12, 12)).toBeNull(); expect(calculateEMI(0, 12, 12)).toBeNull(); expect(calculateEMI(100000, 12, 0)).toBeNull(); });
});

describe('generateSchedule', () => {
  it('correct length', () => { expect(generateSchedule(100000, 12, 12)).toHaveLength(12); });
  it('closes at 0', () => { const s = generateSchedule(100000, 12, 12); expect(s[s.length-1].closing).toBe(0); });
  it('closes at 0 for 360mo', () => { const s = generateSchedule(5000000, 8.5, 360); expect(s[s.length-1].closing).toBe(0); });
  it('with extra payment closes faster', () => { const s1 = generateSchedule(100000, 12, 12); const s2 = generateSchedule(100000, 12, 12, 1000); expect(s2.length).toBeLessThanOrEqual(s1.length); });
  it('null on bad input', () => { expect(generateSchedule(-1, 12, 12)).toBeNull(); });
});

describe('calculateLoanDetails', () => {
  it('returns all fields', () => {
    const d = calculateLoanDetails({ principal: 1000000, annualRate: 8.5, tenureMonths: 120 });
    expect(d).not.toBeNull();
    expect(d.emi).toBeGreaterThan(0);
    expect(d.totalInterest).toBeGreaterThan(0);
    expect(d.schedule).toBeDefined();
    expect(d.yearly).toBeDefined();
  });
  it('handles processing fee', () => {
    const d = calculateLoanDetails({ principal: 1000000, annualRate: 8.5, tenureMonths: 120, processingFeePct: 2 });
    expect(d.processingFee).toBe(20000);
    expect(d.gstOnFee).toBe(3600);
  });
  it('handles down payment', () => {
    const d = calculateLoanDetails({ principal: 1000000, annualRate: 8.5, tenureMonths: 120, downPayment: 200000 });
    expect(d.effectivePrincipal).toBe(800000);
    expect(d.downPayment).toBe(200000);
  });
  it('null on bad input', () => { expect(calculateLoanDetails({ principal: -1, annualRate: 8.5, tenureMonths: 120 })).toBeNull(); });
});

describe('compareLoans', () => {
  it('returns results with deltas', () => {
    const r = compareLoans([
      { id: 1, principal: 1000000, rate: 8.5, tenureMonths: 120, label: 'A' },
      { id: 2, principal: 1000000, rate: 9.5, tenureMonths: 120, label: 'B' },
    ]);
    expect(r).toHaveLength(2);
    expect(r[0].details).toBeDefined();
    expect(r[1].delta.vsBest).toBeDefined();
  });
  it('null on empty', () => { expect(compareLoans([])).toBeNull(); });
});

describe('formatINR', () => {
  it('formats', () => { expect(formatINR(100000)).toBe('₹1,00,000'); });
  it('compact', () => { expect(formatINR(100000, true)).toBe('₹1.0 L'); });
  it('null', () => { expect(formatINR(null)).toBe('—'); });
});

describe('validateInputs', () => {
  it('valid', () => { expect(validateInputs(1000000, 8.5, 120).isValid).toBe(true); });
  it('low principal', () => { expect(validateInputs(5000, 8.5, 120).isValid).toBe(false); });
});
