# Loan EMI Calculator — Professional Loan Planner

A high-performance, responsive financial web application for calculating Equated Monthly Installments (EMI), visualizing amortization schedules, and comparing loan scenarios side-by-side.

## 🚀 Key Features

- **Interactive EMI Calculation**: Real-time updates as you adjust Loan Amount, Interest Rate, Tenure, Down Payment, Processing Fee, and Extra Monthly Payments.
- **Flexible Payment Frequencies**: Supports Monthly, Quarterly, and Half-Yearly repayment schedules.
- **Amortization Schedule**: Searchable, sortable, paginated schedule available in Yearly and Monthly aggregations.
- **Side-by-Side Loan Comparison**: Compare 2–3 loan scenarios with dynamic delta insights highlighting cost vs. monthly burden trade-offs.
- **Visual Analytics**: Interactive Chart.js visualizations including Doughnut split, Balance burn-down, and Yearly timeline bar charts.
- **Data Export & Sharing**: 
  - Export amortization schedule to CSV (Excel compatible with BOM).
  - Print-formatted PDF report.
  - One-click URL parameter state sharing (e.g. `?p=1000000&r=8.5&t=120`).
- **Persistence & Presets**: Quick-start presets (Home, Car, Education, Personal) and local storage for saved scenarios.
- **Design System & UX**: Glassmorphism aesthetic, theme toggle (Dark/Light mode), responsive layout, and full keyboard shortcut support.

## 📐 Calculation Engine & Formula

Uses standard reducing-balance EMI calculation:

```
EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]
```

Where:
- **P** = Effective Principal (`Principal - Down Payment`)
- **R** = Rate per period (`Annual Rate / Periods per Year / 100`)
- **N** = Total periods (`Tenure in Years × Periods per Year`)

### Key Algorithmic Safeguards
- **Zero Amortization Drift**: The final period special-cases the principal component to match exact remaining balance, guaranteeing a final balance of 0.
- **0% Interest Rate Handling**: Gracefully falls back to linear principal division (`P / N`).
- **Input Validation**: Strict validation prevents invalid inputs (e.g. negative values, tenure = 0, rate > 50%).

## 🛠️ Tech Stack

- **HTML5**: Semantic markup, ARIA accessibility standards, Open Graph & Twitter meta tags.
- **Vanilla CSS3**: Design system tokens, custom CSS variables, Glassmorphism, animations, `@media print` rules.
- **JavaScript (ES6+)**: Pure functional calculation engine, DOM management, async event handling.
- **Chart.js (v4.4.7)**: Responsive canvas charts with custom dark/light theme integration.

## 📁 File Structure

```
loan-emi-calculator/
├── index.html        # Main HTML layout & modal structures
├── style.css         # Complete design system tokens & component styles
├── script.js        # Engine, state management, chart rendering, & event listeners
├── public/           # Media assets and icons
└── README.md         # Documentation
```

## 💻 Running the Application

No build tools or node packages required. Simply open `index.html` in any modern web browser or serve it via a local static web server (e.g., VS Code Live Server or Python `http.server`).

```bash
# Example static server using Python:
python -m http.server 8000
```
