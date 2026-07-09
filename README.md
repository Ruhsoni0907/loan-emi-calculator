# Loan EMI Calculator — Portfolio Case Study

## Problem

Borrowers need to understand the true cost of a loan before committing. Most online EMI calculators are functional but generic — they show numbers without context, lack comparison tools, and don't communicate the trade-offs between lower monthly payments and higher total interest. This project builds a calculator that makes those trade-offs visible and actionable.

## Key Design & Technical Decisions

### Architecture
- **Separation of concerns**: All calculation logic lives in `src/lib/emiEngine.js` — a pure, framework-agnostic module with zero React dependencies. This makes the engine independently testable, portable to any framework, and trivially replaceable.
- **Component decomposition**: Each visual concern is its own component (`InputPanel`, `ResultSummary`, `BurnDownChart`, `AmortizationTable`, `ComparisonMode`, `PDFExport`). State flows down, callbacks flow up. No prop drilling beyond one level.
- **Memoization**: Derived values (EMI, schedule, yearly aggregates, comparison deltas) are computed with `useMemo` so they only recalculate when inputs actually change, not on every render.

### Calculation Engine
The standard reducing-balance EMI formula:

```
EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]
```

where:
- **P** = Principal (loan amount)
- **R** = Monthly interest rate = Annual rate / 12 / 100
- **N** = Tenure in months

**Rounding strategy**: All intermediate calculations use full floating-point precision. Final values are rounded to 2 decimal places. The amortization schedule's last month is special-cased: the principal component equals the remaining opening balance, ensuring the closing balance is exactly 0 with no rounding drift.

**0% interest**: Handled as a simple `P / N` division.

### Visual Identity
- **Palette**: Deep teal (#0D4C4A) for primary/trust, warm amber (#E8A838) for accent/warmth, off-white (#F7F5F0) background for a warm, non-generic feel.
- **Typography**: Inter for display and body text (clean, professional), JetBrains Mono for all numerical data (tabular nums, clear digit distinction).
- **Signature element**: The comparison mode's delta callouts — plain-language sentences explaining exactly how scenarios differ in cost and monthly burden, paired with a grouped bar chart.

### Comparison Mode
The comparison feature (2–3 configurable scenarios) computes dynamic deltas rather than hardcoding which is "better." The callout language adapts: "Scenario B saves ₹X in total interest but costs ₹Y more per month than Scenario A" — because the right choice depends on whether the user prioritizes lower EMI or lower total cost.

## Assumptions
- Fixed interest rate for the entire tenure (no floating-rate simulation)
- Equal monthly installments (standard EMI)
- Interest calculated on reducing balance
- No processing fees, prepayments, or penal charges
- Indian Rupee (₹) as the display currency

## Known Limitations
- **Fixed rate only**: Real loans may have floating rates linked to a benchmark
- **No prepayment modeling**: Prepayments change the amortization schedule fundamentally
- **Single currency**: Hardcoded to ₹; could be parameterized
- **No inflation adjustment**: Real cost of money over 20-30 years is significant
- **Comparison mode max 3 scenarios**: Limited by horizontal space on desktop

## What I'd Build Next
- **Prepayment / part-payment simulator**: Let users model lump-sum prepayments and see the impact on tenure and total interest
- **Step-up EMI**: Model increasing EMIs (e.g., 10% annual increase) to show how aggressive early repayment shortens tenure
- **Rate sensitivity analysis**: Plot how total cost changes across a range of interest rates
- **Export options**: CSV export for the amortization schedule, shareable link with encoded parameters
- **Comparison history**: localStorage-backed history of past comparisons
- **Dark mode**: System-preference-aware theme toggle
- **Multi-currency support**: Configurable currency symbol and locale formatting

## Running the Project

```bash
npm install
npm run dev        # Start dev server
npm run build      # Production build
npx vitest run     # Run unit tests
```

## Tech Stack
- React 19 + Vite 8
- Tailwind CSS 4
- Recharts (charts)
- jsPDF (PDF export)
- Vitest + Testing Library (tests)
