import { describe, it, expect } from 'vitest';
import {
  calculateEMI,
  generateAmortizationSchedule,
  aggregateYearly,
  compareLoans,
  validateInputs,
  formatINR,
  formatINRExact,
} from '../lib/emiEngine.js';

describe('calculateEMI', () => {
  it('calculates EMI for a standard loan', () => {
    const emi = calculateEMI(100000, 12, 12);
    expect(emi).toBeCloseTo(8884.88, 0);
  });

  it('handles 0% interest rate', () => {
    const emi = calculateEMI(120000, 0, 12);
    expect(emi).toBe(10000);
  });

  it('handles very low rate (0.1%)', () => {
    const emi = calculateEMI(100000, 0.1, 12);
    expect(emi).toBeGreaterThan(0);
    expect(Number.isFinite(emi)).toBe(true);
  });

  it('handles single-month tenure', () => {
    const emi = calculateEMI(100000, 12, 1);
    expect(emi).toBe(101000);
  });

  it('handles very long tenure (30 years / 360 months)', () => {
    const emi = calculateEMI(5000000, 8.5, 360);
    expect(emi).toBeGreaterThan(0);
    expect(Number.isFinite(emi)).toBe(true);
    expect(emi).toBeLessThan(5000000);
  });

  it('returns null for negative principal', () => {
    expect(calculateEMI(-100000, 12, 12)).toBeNull();
  });

  it('returns null for zero principal', () => {
    expect(calculateEMI(0, 12, 12)).toBeNull();
  });

  it('returns null for negative tenure', () => {
    expect(calculateEMI(100000, 12, -12)).toBeNull();
  });

  it('returns null for zero tenure', () => {
    expect(calculateEMI(100000, 12, 0)).toBeNull();
  });

  it('returns null for negative interest rate', () => {
    expect(calculateEMI(100000, -5, 12)).toBeNull();
  });

  it('returns null for non-finite inputs', () => {
    expect(calculateEMI(NaN, 12, 12)).toBeNull();
    expect(calculateEMI(100000, Infinity, 12)).toBeNull();
    expect(calculateEMI(100000, 12, NaN)).toBeNull();
  });

  it('returns null for string inputs', () => {
    expect(calculateEMI('100000', 12, 12)).toBeNull();
  });
});

describe('generateAmortizationSchedule', () => {
  it('generates correct number of rows', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 12);
    expect(schedule).toHaveLength(12);
  });

  it('first row opens at principal amount', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 12);
    expect(schedule[0].opening).toBe(100000);
  });

  it('final closing balance is exactly 0', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 12);
    expect(schedule[schedule.length - 1].closing).toBe(0);
  });

  it('final closing balance is exactly 0 for long tenure', () => {
    const schedule = generateAmortizationSchedule(5000000, 8.5, 360);
    expect(schedule[schedule.length - 1].closing).toBe(0);
  });

  it('final closing balance is exactly 0 for 0% interest', () => {
    const schedule = generateAmortizationSchedule(120000, 0, 12);
    expect(schedule[schedule.length - 1].closing).toBe(0);
  });

  it('final closing balance is exactly 0 for single month', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 1);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].closing).toBe(0);
  });

  it('has correct year assignments', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 24);
    expect(schedule[11].year).toBe(1);
    expect(schedule[12].year).toBe(2);
  });

  it('returns null for invalid inputs', () => {
    expect(generateAmortizationSchedule(-100000, 12, 12)).toBeNull();
    expect(generateAmortizationSchedule(100000, 12, 0)).toBeNull();
  });

  it('each month: principalComponent + interestComponent ≈ emi (within rounding)', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 12);
    for (let i = 0; i < schedule.length - 1; i++) {
      const row = schedule[i];
      const sum = Math.round((row.principalComponent + row.interestComponent) * 100) / 100;
      expect(sum).toBe(row.emi);
    }
  });
});

describe('aggregateYearly', () => {
  it('aggregates monthly schedule into correct number of years', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 12);
    const yearly = aggregateYearly(schedule);
    expect(yearly).toHaveLength(1);
    expect(yearly[0].year).toBe(1);
  });

  it('aggregates multi-year correctly', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 36);
    const yearly = aggregateYearly(schedule);
    expect(yearly).toHaveLength(3);
  });

  it('yearly opening matches first month opening', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 12);
    const yearly = aggregateYearly(schedule);
    expect(yearly[0].opening).toBe(schedule[0].opening);
  });

  it('yearly closing matches last month closing', () => {
    const schedule = generateAmortizationSchedule(100000, 12, 24);
    const yearly = aggregateYearly(schedule);
    expect(yearly[1].closing).toBe(schedule[schedule.length - 1].closing);
  });

  it('returns null for empty array', () => {
    expect(aggregateYearly([])).toBeNull();
  });

  it('returns null for non-array', () => {
    expect(aggregateYearly(null)).toBeNull();
  });
});

describe('compareLoans', () => {
  it('returns correct structure', () => {
    const scenarios = [
      { principal: 1000000, rate: 8.5, tenureMonths: 120, label: 'A' },
      { principal: 1000000, rate: 9.0, tenureMonths: 120, label: 'B' },
    ];
    const result = compareLoans(scenarios);
    expect(result).toHaveLength(2);
    expect(result[0].emi).toBeGreaterThan(0);
    expect(result[1].emi).toBeGreaterThan(0);
  });

  it('lower rate scenario has lower total interest', () => {
    const scenarios = [
      { principal: 1000000, rate: 8.5, tenureMonths: 120, label: 'A' },
      { principal: 1000000, rate: 9.5, tenureMonths: 120, label: 'B' },
    ];
    const result = compareLoans(scenarios);
    expect(result[0].totalInterest).toBeLessThan(result[1].totalInterest);
  });

  it('marks best interest scenario correctly', () => {
    const scenarios = [
      { principal: 1000000, rate: 9.0, tenureMonths: 120, label: 'A' },
      { principal: 1000000, rate: 8.5, tenureMonths: 120, label: 'B' },
    ];
    const result = compareLoans(scenarios);
    expect(result[1].isBestInterest).toBe(true);
  });

  it('returns null for empty array', () => {
    expect(compareLoans([])).toBeNull();
  });

  it('handles scenarios with invalid inputs gracefully', () => {
    const scenarios = [
      { principal: -1000, rate: 8.5, tenureMonths: 120, label: 'Invalid' },
      { principal: 1000000, rate: 9.0, tenureMonths: 120, label: 'Valid' },
    ];
    const result = compareLoans(scenarios);
    expect(result[0].emi).toBeNull();
    expect(result[1].emi).toBeGreaterThan(0);
  });
});

describe('validateInputs', () => {
  it('validates correct inputs', () => {
    const result = validateInputs(1000000, 8.5, 120);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('catches low principal', () => {
    const result = validateInputs(5000, 8.5, 120);
    expect(result.isValid).toBe(false);
    expect(result.errors.principal).toBeDefined();
  });

  it('catches high rate', () => {
    const result = validateInputs(1000000, 55, 120);
    expect(result.isValid).toBe(false);
    expect(result.errors.annualRate).toBeDefined();
  });

  it('catches long tenure', () => {
    const result = validateInputs(1000000, 8.5, 400);
    expect(result.isValid).toBe(false);
    expect(result.errors.tenureMonths).toBeDefined();
  });
});

describe('formatINR', () => {
  it('formats with compact notation', () => {
    expect(formatINR(100000, true)).toBe('₹1.0 L');
    expect(formatINR(10000000, true)).toBe('₹1.0 Cr');
    expect(formatINR(5000, true)).toBe('₹5.0K');
  });

  it('formats without compact notation', () => {
    expect(formatINR(100000)).toBe('₹1,00,000');
  });

  it('handles null/undefined', () => {
    expect(formatINR(null)).toBe('—');
    expect(formatINR(undefined)).toBe('—');
  });
});
