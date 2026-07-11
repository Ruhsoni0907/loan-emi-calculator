/* ============================================
   EMI Calculator — Application Logic
   Organized: State → Engine → UI → Charts → Table → Events
   ============================================ */

// ─── STATE ────────────────────────────────────────────
const state = {
  principal: 1000000, annualRate: 8.5, tenureYears: 10, tenureMonths: 120,
  tenureMode: 'years', frequency: 'monthly',
  processingFeePct: 1, downPayment: 0, extraPayment: 0,
  mode: 'calculator', activeChart: 'doughnut',
  tableView: 'yearly', tablePage: 1, tableSort: 'year', tableSortDir: 'asc',
  tableSearch: '', tablePerPage: 12,
  scenarios: [], savedScenarios: [],
  currentPreset: null,
};

const PRESETS = {
  home: { principal: 5000000, annualRate: 8.5, tenure: 20, color: '#2563EB' },
  car: { principal: 800000, annualRate: 9.0, tenure: 5, color: '#22C55E' },
  edu: { principal: 2000000, annualRate: 10.5, tenure: 10, color: '#6366F1' },
  personal: { principal: 500000, annualRate: 12.0, tenure: 3, color: '#F59E0B' },
};

const FREQ_MAP = { monthly: 12, quarterly: 4, 'half-yearly': 2 };
let details = null;
let charts = { doughnut: null, balance: null, timeline: null };
let stepperInterval = null;
let debounceTimer = null;

// ─── CALCULATION ENGINE ──────────────────────────────
function calculateEMI(P, annualRate, N) {
  if (P <= 0 || N <= 0 || isNaN(P) || isNaN(N)) return null;
  const R = annualRate / 12 / 100;
  if (R === 0) return Math.round((P / N) * 100) / 100;
  const f = Math.pow(1 + R, N);
  return Math.round((P * R * f) / (f - 1) * 100) / 100;
}

function generateSchedule(principal, annualRate, tenureMonths, extraPayment) {
  if (principal <= 0 || tenureMonths <= 0) return null;
  const R = annualRate / 12 / 100;
  const baseEMI = calculateEMI(principal, annualRate, tenureMonths);
  if (!baseEMI) return null;
  const schedule = [];
  let balance = Math.round(principal * 100) / 100;
  let totalInt = 0;
  let month = 0;
  while (balance > 0 && month < tenureMonths + 120) {
    month++;
    const year = Math.ceil(month / 12);
    const opening = balance;
    const interest = R === 0 ? 0 : Math.round(balance * R * 100) / 100;
    totalInt = Math.round((totalInt + interest) * 100) / 100;
    const emi = month <= tenureMonths ? baseEMI : balance + interest;
    const extra = month <= tenureMonths ? extraPayment : 0;
    let princPart = Math.round((emi + extra - interest) * 100) / 100;
    if (princPart > balance) princPart = balance;
    balance = Math.round((balance - princPart) * 100) / 100;
    if (balance < 0) balance = 0;
    schedule.push({ month, year, opening: Math.round(opening * 100) / 100, emi: Math.round(emi * 100) / 100, extra, interest, principalComponent: Math.round(princPart * 100) / 100, closing: balance, totalInterestPaid: totalInt });
    if (balance === 0) break;
  }
  return schedule;
}

function computeDetails() {
  const P = state.principal;
  const rate = state.annualRate;
  const tenureMonths = state.tenureMode === 'years' ? state.tenureYears * 12 : state.tenureMonths;
  const effectiveP = P - state.downPayment;
  if (effectiveP <= 0 || tenureMonths <= 0) return null;

  const schedule = generateSchedule(effectiveP, rate, tenureMonths, state.extraPayment);
  if (!schedule) return null;

  const totalPayable = schedule.reduce((s, r) => s + r.emi + r.extra, 0);
  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const procFee = Math.round(P * state.processingFeePct / 100 * 100) / 100;
  const gst = Math.round(procFee * 0.18 * 100) / 100;
  const totalFee = Math.round((procFee + gst) * 100) / 100;
  const principalPct = Math.round(effectiveP / totalPayable * 100);
  const interestPct = 100 - principalPct;

  // Yearly aggregation
  const yearly = [];
  let cy = null, yd = null;
  for (const r of schedule) {
    if (r.year !== cy) { if (yd) yearly.push(yd); cy = r.year; yd = { year: cy, opening: r.opening, closing: r.closing, emi: 0, interest: 0, principal: 0, extra: 0, months: 0 }; }
    yd.emi += r.emi; yd.interest += r.interest; yd.principal += r.principalComponent; yd.extra += r.extra; yd.closing = r.closing; yd.months++;
  }
  if (yd) yearly.push(yd);

  return {
    emi: schedule[0].emi, effectivePrincipal: effectiveP,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalPayableWithFee: Math.round((totalPayable + totalFee + state.downPayment) * 100) / 100,
    processingFee: procFee, gstOnFee: gst, totalFee, downPayment: state.downPayment, extraPayment: state.extraPayment,
    principalPct, interestPct, totalMonths: schedule.length,
    effectiveMonthlyRate: Math.round(rate / 12 * 100) / 100,
    schedule, yearly: yearly.map(y => ({ ...y, emi: Math.round(y.emi * 100) / 100, interest: Math.round(y.interest * 100) / 100, principal: Math.round(y.principal * 100) / 100, extra: Math.round(y.extra * 100) / 100 })),
  };
}

function compareLoans(scenarios) {
  return scenarios.map(s => {
    const oldState = { ...state };
    Object.assign(state, { principal: s.principal, annualRate: s.rate, tenureMode: 'months', tenureMonths: s.tenureMonths, tenureYears: Math.round(s.tenureMonths / 12), processingFeePct: s.processingFeePct || 1, downPayment: s.downPayment || 0, extraPayment: s.extraPayment || 0 });
    const d = computeDetails();
    Object.assign(state, oldState);
    return { ...s, details: d };
  });
}

// ─── FORMATTING ──────────────────────────────────────
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function fmtINR(v, compact = false) {
  if (v == null || isNaN(v)) return '—';
  if (compact) {
    if (v >= 1e7) return '₹' + (v / 1e7).toFixed(1) + ' Cr';
    if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + ' L';
    if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1) + 'K';
  }
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtINRExact(v) {
  if (v == null || isNaN(v)) return '—';
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── UI RENDER ───────────────────────────────────────
function render() {
  details = computeDetails();
  renderHero();
  renderDashboard();
  renderCharts();
  renderTable();
  updateSliderStyles();
  updateDisplayValues();
  updateSegmentIndicators();
}

function updateDisplayValues() {
  const tenureMonths = state.tenureMode === 'years' ? state.tenureYears * 12 : state.tenureMonths;
  setText('principal-display', fmtINR(state.principal));
  setText('rate-display', state.annualRate.toFixed(1) + '%');
  setText('tenure-display', (state.tenureMode === 'years' ? state.tenureYears : state.tenureMonths) + ' ' + (state.tenureMode === 'years' ? 'yr' : 'mo'));
  setText('fee-display', state.processingFeePct.toFixed(1) + '%');
  setText('downpayment-display', fmtINR(state.downPayment));
  setText('extrapayment-display', fmtINR(state.extraPayment));
  setText('tenure-unit', state.tenureMode === 'years' ? 'yr' : 'mo');
  // Sync number inputs
  const el = (id) => document.getElementById(id);
  if (el('principal')) el('principal').value = state.principal;
  if (el('rate')) el('rate').value = state.annualRate;
  if (el('tenure')) el('tenure').value = state.tenureMode === 'years' ? state.tenureYears : state.tenureMonths;
  if (el('principal-slider')) { el('principal-slider').value = state.principal; updateSliderFill(el('principal-slider')); }
  if (el('rate-slider')) { el('rate-slider').value = state.annualRate; updateSliderFill(el('rate-slider')); }
  if (el('tenure-slider')) { el('tenure-slider').value = state.tenureMode === 'years' ? state.tenureYears : state.tenureMonths; updateSliderFill(el('tenure-slider')); }
  if (el('fee-slider')) { el('fee-slider').value = state.processingFeePct; updateSliderFill(el('fee-slider')); }
  if (el('downpayment-slider')) { el('downpayment-slider').value = state.downPayment; updateSliderFill(el('downpayment-slider')); }
  if (el('extrapayment-slider')) { el('extrapayment-slider').value = state.extraPayment; updateSliderFill(el('extrapayment-slider')); }
  // Update max for down payment slider
  const dpMax = Math.floor(state.principal * 0.5);
  const dpSlider = el('downpayment-slider');
  if (dpSlider) { dpSlider.max = dpMax; if (state.downPayment > dpMax) { state.downPayment = dpMax; dpSlider.value = dpMax; } updateSliderFill(dpSlider); }
  setText('dp-max-label', fmtINR(dpMax, true));
}

function renderHero() {
  const valEl = document.getElementById('emi-value');
  const subEl = document.getElementById('emi-sub');
  const metricsEl = document.getElementById('emi-metrics');
  if (!details) {
    if (valEl) valEl.textContent = '₹0';
    if (subEl) subEl.textContent = '—';
    if (metricsEl) metricsEl.innerHTML = '';
    return;
  }
  if (valEl) valEl.textContent = fmtINRExact(details.emi);
  if (subEl) subEl.textContent = `${details.totalMonths} months · ${state.annualRate}% p.a. · ${state.frequency}`;
  if (metricsEl) metricsEl.innerHTML = `
    <div class="hero-metric"><p class="hero-metric-label">Interest</p><p class="hero-metric-value">${fmtINR(details.totalInterest, true)}</p></div>
    <div class="hero-metric"><p class="hero-metric-label">Total</p><p class="hero-metric-value">${fmtINR(details.totalPayable, true)}</p></div>
    <div class="hero-metric"><p class="hero-metric-label">Fee</p><p class="hero-metric-value">${fmtINR(details.totalFee)}</p></div>`;
}

function renderDashboard() {
  if (!details) { document.getElementById('dashboard-cards').innerHTML = ''; return; }
  const cards = [
    { label: 'Monthly EMI', value: fmtINRExact(details.emi), icon: '₹', color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
    { label: 'Total Interest', value: fmtINR(details.totalInterest, true), icon: '📈', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Principal', value: fmtINR(details.effectivePrincipal, true), icon: '🏦', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Processing Fee', value: fmtINR(details.totalFee), icon: '📋', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Total Payment', value: fmtINR(details.totalPayableWithFee, true), icon: '💳', color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
    { label: 'Total Months', value: details.totalMonths, icon: '📅', color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
  ];
  document.getElementById('dashboard-cards').innerHTML = cards.map(c => `
    <div class="dash-card" style="--accent-color:${c.color}">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${c.color};border-radius:3px 3px 0 0"></div>
      <div class="dash-card-icon" style="background:${c.bg};color:${c.color};font-size:18px">${c.icon}</div>
      <p class="dash-card-label">${c.label}</p>
      <p class="dash-card-value" style="color:${c.color}">${c.value}</p>
    </div>`).join('');
}

function getChartColors() {
  const s = getComputedStyle(document.documentElement);
  return {
    gridColor: s.getPropertyValue('--border-subtle').trim() || 'rgba(0,0,0,0.04)',
    tickColor: s.getPropertyValue('--text-tertiary').trim() || '#90A4AE',
    tooltipBg: s.getPropertyValue('--surface-elevated').trim() || '#1a1a2e',
    textColor: s.getPropertyValue('--text-primary').trim() || '#333',
  };
}

// ─── CHARTS ──────────────────────────────────────────
function renderCharts() {
  if (!details) return;
  renderDoughnut();
  renderBalanceChart();
  renderTimelineChart();
}

function renderDoughnut() {
  const ctx = document.getElementById('canvas-doughnut');
  if (!ctx) return;
  if (charts.doughnut) charts.doughnut.destroy();
  const cc = getChartColors();
  charts.doughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Principal', 'Interest'],
      datasets: [{ data: [details.effectivePrincipal, details.totalInterest], backgroundColor: ['#2563EB', '#EF4444'], borderWidth: 0, borderRadius: 4, spacing: 4 }],
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '72%',
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: cc.tooltipBg, titleFont: { family: 'Inter', size: 12 }, bodyFont: { family: 'JetBrains Mono', size: 11 }, padding: 12, cornerRadius: 12, callbacks: { label: (c) => ' ' + c.label + ': ' + fmtINR(c.raw, true) } } },
    },
  });
  document.getElementById('chart-center-label').innerHTML = `<div class="pct">${details.principalPct}%</div><div class="lbl">Principal</div>`;
}

function renderBalanceChart() {
  const ctx = document.getElementById('canvas-balance');
  if (!ctx) return;
  if (charts.balance) charts.balance.destroy();
  const cc = getChartColors();
  const s = details.schedule;
  const rate = s.length > 36 ? 6 : s.length > 12 ? 3 : 1;
  const sampled = s.filter((_, i) => i % rate === 0 || i === s.length - 1);
  charts.balance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sampled.map(r => 'M' + r.month),
      datasets: [
        { label: 'Balance', data: sampled.map(r => r.closing), borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
        { label: 'Cum. Interest', data: sampled.map(r => r.totalInterestPaid), borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: true, interaction: { intersect: false, mode: 'index' },
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: cc.tooltipBg, titleFont: { family: 'Inter', size: 11 }, bodyFont: { family: 'JetBrains Mono', size: 10 }, padding: 10, cornerRadius: 10, callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + fmtINR(c.raw, true) } } },
      scales: { x: { display: false }, y: { grid: { color: cc.gridColor, drawBorder: false }, ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: cc.tickColor, callback: v => fmtINR(v, true) } } },
    },
  });
}

function renderTimelineChart() {
  const ctx = document.getElementById('canvas-timeline');
  if (!ctx) return;
  if (charts.timeline) charts.timeline.destroy();
  const cc = getChartColors();
  charts.timeline = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: details.yearly.map(y => 'Y' + y.year),
      datasets: [
        { label: 'Principal', data: details.yearly.map(y => y.principal), backgroundColor: '#2563EB', borderRadius: 6 },
        { label: 'Interest', data: details.yearly.map(y => y.interest), backgroundColor: '#EF4444', borderRadius: 6 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: cc.tooltipBg, titleFont: { family: 'Inter', size: 11 }, bodyFont: { family: 'JetBrains Mono', size: 10 }, padding: 10, cornerRadius: 10, callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + fmtINR(c.raw, true) } } },
      scales: { x: { grid: { display: false }, ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: cc.tickColor } }, y: { stacked: true, grid: { color: cc.gridColor, drawBorder: false }, ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: cc.tickColor, callback: v => fmtINR(v, true) } } },
    },
  });
}

// ─── TABLE ───────────────────────────────────────────
function renderTable() {
  if (!details) return;
  const data = state.tableView === 'yearly' ? details.yearly : details.schedule;
  let filtered = data;
  if (state.tableSearch) {
    const s = state.tableSearch.toLowerCase();
    filtered = data.filter(r => String(r.month || r.year).includes(s) || String(r.emi).includes(s));
  }
  filtered.sort((a, b) => {
    const av = a[state.tableSort] ?? 0, bv = b[state.tableSort] ?? 0;
    return state.tableSortDir === 'asc' ? av - bv : bv - av;
  });
  const totalPages = Math.ceil(filtered.length / state.tablePerPage);
  if (state.tablePage > totalPages) state.tablePage = totalPages || 1;
  const paged = filtered.slice((state.tablePage - 1) * state.tablePerPage, state.tablePage * state.tablePerPage);

  const cols = state.tableView === 'yearly'
    ? [{ key: 'year', label: 'Year' }, { key: 'opening', label: 'Opening' }, { key: 'emi', label: 'Total EMI' }, { key: 'interest', label: 'Interest' }, { key: 'principal', label: 'Principal' }, { key: 'closing', label: 'Closing' }]
    : [{ key: 'month', label: 'Month' }, { key: 'opening', label: 'Opening' }, { key: 'emi', label: 'EMI' }, { key: 'interest', label: 'Interest' }, { key: 'principalComponent', label: 'Principal' }, { key: 'closing', label: 'Closing' }];

  document.getElementById('table-head').innerHTML = cols.map(c =>
    `<th class="${state.tableSort === c.key ? 'sorted' : ''}" onclick="sortTable('${c.key}')">${c.label} <span class="sort-arrow">${state.tableSort === c.key ? (state.tableSortDir === 'asc' ? '↑' : '↓') : '↕'}</span></th>`
  ).join('');

  document.getElementById('table-body').innerHTML = paged.map(r =>
    '<tr>' + cols.map(c => `<td>${(c.key === 'month' || c.key === 'year') ? r[c.key] : fmtINR(r[c.key])}</td>`).join('') + '</tr>'
  ).join('');

  document.getElementById('table-info').textContent = `Page ${state.tablePage} of ${totalPages || 1} (${filtered.length} rows)`;

  let pag = '';
  pag += `<button class="page-btn" onclick="goPage(${state.tablePage - 1})" ${state.tablePage <= 1 ? 'disabled' : ''}>←</button>`;
  for (let i = 1; i <= Math.min(totalPages, 7); i++) {
    pag += `<button class="page-btn ${i === state.tablePage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (totalPages > 7) pag += `<button class="page-btn" disabled>…</button><button class="page-btn" onclick="goPage(${totalPages})">${totalPages}</button>`;
  pag += `<button class="page-btn" onclick="goPage(${state.tablePage + 1})" ${state.tablePage >= totalPages ? 'disabled' : ''}>→</button>`;
  document.getElementById('pagination').innerHTML = pag;
}

// ─── SEGMENT INDICATOR ────────────────────────────────
function updateSegmentIndicators() {
  document.querySelectorAll('.segment-control').forEach(ctrl => {
    const indicator = ctrl.querySelector('.segment-indicator');
    if (!indicator) return;
    const active = ctrl.querySelector('.segment-btn.active');
    if (!active) return;
    const ctrlRect = ctrl.getBoundingClientRect();
    const btnRect = active.getBoundingClientRect();
    indicator.style.width = btnRect.width + 'px';
    indicator.style.transform = `translateX(${btnRect.left - ctrlRect.left - 3}px)`;
  });
}

// ─── SLIDER STYLING ──────────────────────────────────
function updateSliderStyles() {
  document.querySelectorAll('.slider').forEach(sl => {
    updateSliderFill(sl);
  });
}

function updateSliderFill(sl) {
  const pct = ((sl.value - sl.min) / (sl.max - sl.min)) * 100;
  sl.style.setProperty('--slider-pct', pct + '%');
}

function syncSliderToInput(sliderId, key) {
  const el = (id) => document.getElementById(id);
  if (sliderId === 'principal-slider' && el('principal')) el('principal').value = state.principal;
  if (sliderId === 'rate-slider' && el('rate')) el('rate').value = state.annualRate;
  if (sliderId === 'tenure-slider' && el('tenure')) el('tenure').value = state.tenureMode === 'years' ? state.tenureYears : state.tenureMonths;
  if (sliderId === 'fee-slider') setText('fee-display', state.processingFeePct.toFixed(1) + '%');
  if (sliderId === 'downpayment-slider') setText('downpayment-display', fmtINR(state.downPayment));
  if (sliderId === 'extrapayment-slider') setText('extrapayment-display', fmtINR(state.extraPayment));
  setText('principal-display', fmtINR(state.principal));
  setText('rate-display', state.annualRate.toFixed(1) + '%');
  setText('tenure-display', (state.tenureMode === 'years' ? state.tenureYears : state.tenureMonths) + ' ' + (state.tenureMode === 'years' ? 'yr' : 'mo'));
  setText('tenure-unit', state.tenureMode === 'years' ? 'yr' : 'mo');
}

// ─── EVENT HANDLERS ──────────────────────────────────
function bindInputs() {
  // Number inputs ↔ state
  const bind = (id, key, transform) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      let v = parseFloat(el.value);
      if (isNaN(v)) return;
      if (transform) v = transform(v);
      state[key] = v;
      state.currentPreset = null;
      debounceRender();
    });
    el.addEventListener('blur', () => validateField(id, key));
  };

  bind('principal', 'principal', v => Math.max(10000, Math.min(100000000, v)));
  bind('rate', 'annualRate', v => Math.max(0.1, Math.min(50, v)));

  const tenureInp = document.getElementById('tenure');
  if (tenureInp) {
    tenureInp.addEventListener('input', () => {
      let v = parseFloat(tenureInp.value);
      if (isNaN(v)) return;
      v = Math.max(1, v);
      const key = state.tenureMode === 'years' ? 'tenureYears' : 'tenureMonths';
      state[key] = v;
      state.currentPreset = null;
      debounceRender();
    });
    tenureInp.addEventListener('blur', () => validateField('tenure', state.tenureMode === 'years' ? 'tenureYears' : 'tenureMonths'));
  }

  const bindSlider = (sliderId, keyOrFn) => {
    const sl = document.getElementById(sliderId);
    if (!sl) return;
    updateSliderFill(sl);
    sl.addEventListener('input', () => {
      const key = typeof keyOrFn === 'function' ? keyOrFn() : keyOrFn;
      state[key] = parseFloat(sl.value);
      state.currentPreset = null;
      updateSliderFill(sl);
      syncSliderToInput(sliderId, key);
      debounceRender();
    });
  };
  bindSlider('principal-slider', 'principal');
  bindSlider('rate-slider', 'annualRate');
  bindSlider('tenure-slider', () => state.tenureMode === 'years' ? 'tenureYears' : 'tenureMonths');
  bindSlider('fee-slider', 'processingFeePct');
  bindSlider('downpayment-slider', 'downPayment');
  bindSlider('extrapayment-slider', 'extraPayment');

  // Table search
  document.getElementById('table-search')?.addEventListener('input', (e) => {
    state.tableSearch = e.target.value;
    state.tablePage = 1;
    renderTable();
  });
}

function debounceRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => render(), 60);
}

function validateField(inputId, key) {
  const el = document.getElementById(inputId);
  const errEl = document.getElementById(inputId.replace('-slider', '') + '-error');
  if (!el) return;
  const v = parseFloat(el.value);
  let valid = true, msg = '';
  if (key === 'principal' && v < 10000) { valid = false; msg = 'Minimum ₹10,000'; }
  if (key === 'annualRate' && v > 50) { valid = false; msg = 'Max 50%'; }
  el.classList.toggle('error', !valid);
  el.classList.toggle('valid', valid);
  if (errEl) errEl.textContent = msg;
}

// ─── ACTIONS ─────────────────────────────────────────
function switchMode(mode) {
  state.mode = mode;
  document.querySelectorAll('[data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
    b.setAttribute('aria-selected', b.dataset.mode === mode);
  });
  document.getElementById('mode-calculator').hidden = mode !== 'calculator';
  document.getElementById('mode-compare').hidden = mode !== 'compare';
  if (mode === 'compare') renderCompare();
}

function setTenureMode(mode) {
  state.tenureMode = mode;
  document.querySelectorAll('[data-tenure]').forEach(b => {
    const isActive = b.dataset.tenure === mode;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-checked', isActive);
  });
  const sl = document.getElementById('tenure-slider');
  const inp = document.getElementById('tenure');
  const sliderLabels = document.getElementById('tenure-slider')?.parentElement?.querySelector('.slider-labels');
  if (mode === 'years') {
    sl.max = 30; sl.value = state.tenureYears; inp.value = state.tenureYears; inp.max = 30;
    if (sliderLabels) sliderLabels.innerHTML = '<span>1 yr</span><span>30 yr</span>';
  } else {
    sl.max = 360; sl.value = state.tenureMonths; inp.value = state.tenureMonths; inp.max = 360;
    if (sliderLabels) sliderLabels.innerHTML = '<span>1 mo</span><span>360 mo</span>';
  }
  updateSliderFill(sl);
  render();
}

function setFrequency(freq) {
  state.frequency = freq;
  document.querySelectorAll('[data-freq]').forEach(b => {
    const isActive = b.dataset.freq === freq;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-checked', isActive);
  });
  render();
}

function applyPreset(id) {
  const p = PRESETS[id];
  if (!p) return;
  state.principal = p.principal;
  state.annualRate = p.annualRate;
  state.tenureYears = p.tenure;
  state.tenureMonths = p.tenure * 12;
  state.currentPreset = id;
  state.downPayment = 0;
  state.extraPayment = 0;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', b.dataset.preset === id));
  render();
}

function handleReset() {
  Object.assign(state, {
    principal: 1000000, annualRate: 8.5, tenureYears: 10, tenureMonths: 120,
    tenureMode: 'years', frequency: 'monthly', processingFeePct: 1,
    downPayment: 0, extraPayment: 0, currentPreset: null,
  });
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('[data-tenure]').forEach(b => {
    b.classList.toggle('active', b.dataset.tenure === 'years');
    b.setAttribute('aria-checked', b.dataset.tenure === 'years');
  });
  document.querySelectorAll('[data-freq]').forEach(b => {
    b.classList.toggle('active', b.dataset.freq === 'monthly');
    b.setAttribute('aria-checked', b.dataset.freq === 'monthly');
  });
  const sl = document.getElementById('tenure-slider');
  const inp = document.getElementById('tenure');
  sl.max = 30; sl.value = 10; inp.value = 10; inp.max = 30;
  updateSliderFill(sl);
  render();
  showToast('Calculator reset', 'success');
}

function handleShare() {
  const p = new URLSearchParams({ p: state.principal, r: state.annualRate, t: state.tenureMode === 'years' ? state.tenureYears * 12 : state.tenureMonths, pf: state.processingFeePct, dp: state.downPayment, ep: state.extraPayment });
  const url = location.origin + location.pathname + '?' + p.toString();
  navigator.clipboard?.writeText(url).then(() => showToast('Link copied!', 'success')).catch(() => showToast('Could not copy', 'error'));
}

function handleCopyResults() {
  if (!details) return;
  const text = `EMI Calculator Results\nMonthly EMI: ${fmtINRExact(details.emi)}\nPrincipal: ${fmtINR(details.effectivePrincipal)}\nTotal Interest: ${fmtINR(details.totalInterest)}\nTotal Payable: ${fmtINR(details.totalPayable)}\nTenure: ${details.totalMonths} months\nRate: ${state.annualRate}% p.a.`;
  navigator.clipboard?.writeText(text).then(() => showToast('Results copied!', 'success'));
}

function handleSaveScenario() {
  if (!details) return;
  const name = prompt('Scenario name:', 'My Loan ' + (state.savedScenarios.length + 1));
  if (!name) return;
  state.savedScenarios.push({
    name, timestamp: Date.now(),
    principal: state.principal, annualRate: state.annualRate,
    tenureYears: state.tenureYears, tenureMonths: state.tenureMonths,
    tenureMode: state.tenureMode, frequency: state.frequency,
    processingFeePct: state.processingFeePct, downPayment: state.downPayment,
    extraPayment: state.extraPayment,
  });
  try { localStorage.setItem('emi_saved', JSON.stringify(state.savedScenarios)); } catch {}
  showToast('Scenario saved: ' + name, 'success');
}

// ─── COMPARE MODE ────────────────────────────────────
function renderCompare() {
  if (state.scenarios.length === 0) {
    state.scenarios = [
      { id: 1, principal: 5000000, rate: 8.5, tenureMonths: 240, processingFeePct: 1, downPayment: 0, extraPayment: 0, label: 'Bank A' },
      { id: 2, principal: 5000000, rate: 9.0, tenureMonths: 240, processingFeePct: 0.5, downPayment: 0, extraPayment: 0, label: 'Bank B' },
    ];
  }
  const results = compareLoans(state.scenarios);
  const colors = ['#2563EB', '#22C55E', '#EF4444'];

  // Cards
  document.getElementById('compare-cards').innerHTML = results.map((r, i) => {
    const d = r.details;
    return `<div class="compare-card" style="background:${colors[i]}08;border-color:${colors[i]}30">
      <button class="compare-remove" onclick="removeScenario(${r.id})" aria-label="Remove">×</button>
      <div class="compare-card-header">
        <div class="compare-badge" style="background:${colors[i]}">${String.fromCharCode(65 + i)}</div>
        <input type="text" class="compare-card-label" value="${r.label}" onchange="updateScenarioLabel(${r.id}, this.value)" style="color:${colors[i]}">
      </div>
      <div class="compare-field"><span class="compare-field-label">EMI</span><span class="compare-field-value" style="color:${colors[i]}">${d ? fmtINR(d.emi) : '—'}</span></div>
      <div class="compare-field"><span class="compare-field-label">Interest</span><span class="compare-field-value">${d ? fmtINR(d.totalInterest, true) : '—'}</span></div>
      <div class="compare-field"><span class="compare-field-label">Total</span><span class="compare-field-value">${d ? fmtINR(d.totalPayableWithFee, true) : '—'}</span></div>
      <div class="compare-field"><span class="compare-field-label">Months</span><span class="compare-field-value">${d ? d.totalMonths : '—'}</span></div>
      <hr style="border:none;border-top:1px solid ${colors[i]}20;margin:12px 0 8px">
      <div class="compare-field"><span class="compare-field-label">Rate</span><span class="compare-field-value" contenteditable="true" onblur="updateScenarioField(${r.id},'rate',this.textContent)">${r.rate}%</span></div>
      <div class="compare-field"><span class="compare-field-label">Tenure (mo)</span><span class="compare-field-value" contenteditable="true" onblur="updateScenarioField(${r.id},'tenureMonths',this.textContent)">${r.tenureMonths}</span></div>
    </div>`;
  }).join('') + (state.scenarios.length < 3 ? `<button class="add-compare-card" onclick="addScenario()"><div class="plus">+</div><div class="label">Add Scenario</div></button>` : '');

  // Insights
  const valid = results.filter(r => r.details);
  const first = valid[0];
  let insightsHTML = '';
  if (valid.length >= 2 && first) {
    insightsHTML = `<div class="card-header"><div class="card-header-bar" style="background:var(--accent)"></div><h3 class="card-title">Smart Insights</h3></div><div style="padding:24px">`;
    valid.slice(1).forEach((other, i) => {
      const intDiff = other.details.totalInterest - first.details.totalInterest;
      const emiDiff = other.details.emi - first.details.emi;
      const saves = intDiff < 0;
      insightsHTML += `<div class="compare-insight" style="background:var(--bg-secondary)">
        <div class="compare-insight-header"><div class="compare-insight-icon" style="background:${saves ? 'var(--success-soft)' : 'var(--danger-soft)'};color:${saves ? 'var(--success)' : 'var(--danger)'}">💡</div><strong style="font-size:14px">${other.label} vs ${first.label}</strong></div>
        <div class="compare-delta-grid">
          <div class="compare-delta" style="background:${saves ? 'var(--success-soft)' : 'var(--danger-soft)'}"><p class="compare-delta-label">Interest</p><p class="compare-delta-value" style="color:${saves ? 'var(--success)' : 'var(--danger)'}">${saves ? '−' : '+'}${fmtINR(Math.abs(intDiff), true)}</p></div>
          <div class="compare-delta" style="background:${emiDiff < 0 ? 'var(--success-soft)' : 'var(--danger-soft)'}"><p class="compare-delta-label">EMI</p><p class="compare-delta-value" style="color:${emiDiff < 0 ? 'var(--success)' : 'var(--danger)'}">${emiDiff < 0 ? '−' : '+'}${fmtINR(Math.abs(emiDiff), true)}</p></div>
        </div>
        <p style="font-size:12px;color:var(--text-secondary)">${saves ? other.label + ' saves ' + fmtINR(Math.abs(intDiff), true) + ' in interest.' : other.label + ' costs ' + fmtINR(Math.abs(intDiff), true) + ' more in interest.'}</p>
      </div>`;
    });
    insightsHTML += '</div>';
  }
  document.getElementById('compare-insights').innerHTML = insightsHTML;

  // Bar chart
  if (valid.length > 0) {
    const maxTotal = Math.max(...valid.map(r => r.details.totalPayable));
    document.getElementById('compare-bars').innerHTML = valid.map((r, i) => {
      const pct = (r.details.totalPayable / maxTotal) * 100;
      return `<div class="compare-bar-row">
        <div class="compare-bar-header"><span class="compare-bar-name">${r.label}</span><span class="compare-bar-amount" style="color:${colors[i % 3]}">${fmtINR(r.details.totalPayable, true)}</span></div>
        <div class="compare-bar-track"><div class="compare-bar-fill" style="width:${pct}%;background:${colors[i % 3]}"><span>${fmtINR(r.details.emi)}/mo</span></div></div>
      </div>`;
    }).join('');
  }
  try { localStorage.setItem('emi_compare', JSON.stringify(state.scenarios)); } catch {}
}

function addScenario() {
  if (state.scenarios.length >= 3) return;
  state.scenarios.push({ id: Date.now(), principal: 5000000, rate: 8.5 + state.scenarios.length * 0.5, tenureMonths: 240, processingFeePct: 1, downPayment: 0, extraPayment: 0, label: 'Scenario ' + String.fromCharCode(65 + state.scenarios.length) });
  renderCompare();
}

function removeScenario(id) {
  state.scenarios = state.scenarios.filter(s => s.id !== id);
  renderCompare();
}

function updateScenarioLabel(id, label) {
  const s = state.scenarios.find(s => s.id === id);
  if (s) { s.label = label; renderCompare(); }
}

function updateScenarioField(id, field, value) {
  const s = state.scenarios.find(s => s.id === id);
  if (s) { s[field] = parseFloat(value) || s[field]; renderCompare(); }
}

function resetScenarios() {
  state.scenarios = [
    { id: 1, principal: 5000000, rate: 8.5, tenureMonths: 240, processingFeePct: 1, downPayment: 0, extraPayment: 0, label: 'Bank A' },
    { id: 2, principal: 5000000, rate: 9.0, tenureMonths: 240, processingFeePct: 0.5, downPayment: 0, extraPayment: 0, label: 'Bank B' },
  ];
  renderCompare();
  showToast('Scenarios reset', 'success');
}

// ─── TABLE ACTIONS ───────────────────────────────────
function switchTableView(view) {
  state.tableView = view;
  state.tablePage = 1;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  renderTable();
}

function sortTable(field) {
  if (state.tableSort === field) state.tableSortDir = state.tableSortDir === 'asc' ? 'desc' : 'asc';
  else { state.tableSort = field; state.tableSortDir = 'asc'; }
  renderTable();
}

function goPage(p) {
  const data = state.tableView === 'yearly' ? details?.yearly : details?.schedule;
  const total = Math.ceil((data?.length || 0) / state.tablePerPage);
  state.tablePage = Math.max(1, Math.min(total, p));
  renderTable();
}

function switchChart(type) {
  state.activeChart = type;
  document.querySelectorAll('[data-chart]').forEach(b => b.classList.toggle('active', b.dataset.chart === type));
  document.querySelectorAll('.chart-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('chart-' + type)?.classList.add('active');
}

// ─── EXPORT ──────────────────────────────────────────
function exportCSV() {
  if (!details) return;
  const data = state.tableView === 'yearly' ? details.yearly : details.schedule;
  const headers = state.tableView === 'yearly' ? ['Year','Opening','EMI','Interest','Principal','Closing'] : ['Month','Year','Opening','EMI','Interest','Principal','Closing'];
  const rows = data.map(r => state.tableView === 'yearly' ? [r.year, r.opening, r.emi, r.interest, r.principal, r.closing] : [r.month, r.year, r.opening, r.emi, r.interest, r.principalComponent, r.closing]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'amortization.csv'; a.click();
  showToast('CSV exported', 'success');
}

function exportPDF() {
  showToast('PDF export — use Print (Ctrl+P) for now', 'warning');
}

function printReport() {
  window.print();
  showToast('Print dialog opened', 'success');
}

// ─── THEME ───────────────────────────────────────────
function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('emi_theme', t);
  document.querySelector('.icon-sun').style.display = t === 'dark' ? 'none' : 'block';
  document.querySelector('.icon-moon').style.display = t === 'dark' ? 'block' : 'none';
  if (details) renderCharts();
}

// ─── TOAST ───────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠'}</span> ${msg}`;
  toast.onclick = () => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 200); };
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 200); }, 3000);
}

// ─── MODAL ───────────────────────────────────────────
function toggleShortcutsModal() {
  const m = document.getElementById('shortcuts-modal');
  m.hidden = !m.hidden;
}

// ─── SAVED PANEL ─────────────────────────────────────
function toggleSavedPanel() {
  const p = document.getElementById('saved-panel');
  p.hidden = !p.hidden;
  if (!p.hidden) renderSavedList();
}

function renderSavedList() {
  const list = document.getElementById('saved-list');
  if (state.savedScenarios.length === 0) { list.innerHTML = '<p style="text-align:center;padding:16px;color:var(--text-tertiary);font-size:13px">No saved scenarios yet</p>'; return; }
  list.innerHTML = state.savedScenarios.map((s, i) => `
    <div class="saved-item" onclick="loadScenario(${i})">
      <div><div class="saved-item-name">${s.name}</div><div class="saved-item-detail">${fmtINR(s.principal, true)} · ${s.annualRate}% · ${s.tenureYears || Math.round(s.tenureMonths/12)}yr</div></div>
      <button class="saved-item-delete" onclick="event.stopPropagation();deleteScenario(${i})" aria-label="Delete">✕</button>
    </div>`).join('');
}

function loadScenario(i) {
  const s = state.savedScenarios[i];
  if (!s) return;
  Object.assign(state, { principal: s.principal, annualRate: s.annualRate, tenureYears: s.tenureYears || Math.round(s.tenureMonths / 12), tenureMonths: s.tenureMonths, tenureMode: s.tenureMode || 'years', frequency: s.frequency || 'monthly', processingFeePct: s.processingFeePct || 1, downPayment: s.downPayment || 0, extraPayment: s.extraPayment || 0 });
  const sl = document.getElementById('tenure-slider');
  const inp = document.getElementById('tenure');
  if (sl && inp) {
    if (state.tenureMode === 'years') {
      sl.max = 30; sl.value = state.tenureYears; inp.value = state.tenureYears; inp.max = 30;
    } else {
      sl.max = 360; sl.value = state.tenureMonths; inp.value = state.tenureMonths; inp.max = 360;
    }
    updateSliderFill(sl);
  }
  document.querySelectorAll('[data-tenure]').forEach(b => {
    const isActive = b.dataset.tenure === state.tenureMode;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-checked', isActive);
  });
  document.querySelectorAll('[data-freq]').forEach(b => {
    const isActive = b.dataset.freq === state.frequency;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-checked', isActive);
  });
  render();
  toggleSavedPanel();
  showToast('Loaded: ' + s.name, 'success');
}

function deleteScenario(i) {
  state.savedScenarios.splice(i, 1);
  try { localStorage.setItem('emi_saved', JSON.stringify(state.savedScenarios)); } catch {}
  renderSavedList();
  showToast('Scenario deleted', 'success');
}

// ─── STEPPERS ────────────────────────────────────────
function startStepper(field, delta) {
  const step = () => {
    if (field === 'principal') { state.principal = Math.max(10000, Math.min(100000000, state.principal + delta * 10000)); }
    else if (field === 'rate') { state.annualRate = Math.max(0.1, Math.min(50, Math.round((state.annualRate + delta) * 10) / 10)); }
    else if (field === 'tenure') {
      if (state.tenureMode === 'years') state.tenureYears = Math.max(1, Math.min(30, state.tenureYears + delta));
      else state.tenureMonths = Math.max(1, Math.min(360, state.tenureMonths + delta));
    }
    render();
  };
  step();
  stepperInterval = setInterval(step, 150);
}

function stopStepper() {
  clearInterval(stepperInterval);
  stepperInterval = null;
}

// ─── KEYBOARD ────────────────────────────────────────
function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); handleShare(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSaveScenario(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); printReport(); }
    if (e.key === 'Escape') {
      document.getElementById('shortcuts-modal').hidden = true;
      document.getElementById('saved-panel').hidden = true;
      document.getElementById('export-menu').hidden = true;
    }
    if (e.key === '?' && !e.target.matches('input,textarea')) toggleShortcutsModal();
    // Arrow keys nudge focused slider
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.classList.contains('slider')) {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      e.target.value = parseFloat(e.target.value) + delta * parseFloat(e.target.step);
      e.target.dispatchEvent(new Event('input'));
    }
  });
}

// ─── DROPDOWN ────────────────────────────────────────
function toggleDropdown(id) {
  const el = document.getElementById(id);
  el.hidden = !el.hidden;
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) document.querySelectorAll('.dropdown-menu').forEach(m => m.hidden = true);
});

// ─── URL PARSING ─────────────────────────────────────
function parseURL() {
  const p = new URLSearchParams(location.search);
  const principal = parseFloat(p.get('p'));
  const rate = parseFloat(p.get('r'));
  const tenure = parseFloat(p.get('t'));
  if (principal > 0 && rate >= 0 && tenure > 0) {
    state.principal = principal;
    state.annualRate = rate;
    state.tenureMonths = tenure;
    state.tenureYears = Math.round(tenure / 12);
    state.processingFeePct = parseFloat(p.get('pf')) || 1;
    state.downPayment = parseFloat(p.get('dp')) || 0;
    state.extraPayment = parseFloat(p.get('ep')) || 0;
    const tenureInYears = tenure % 12 === 0 && tenure / 12 <= 30;
    if (tenureInYears) {
      state.tenureMode = 'years';
      state.tenureYears = tenure / 12;
    } else {
      state.tenureMode = 'months';
    }
    const sl = document.getElementById('tenure-slider');
    const inp = document.getElementById('tenure');
    if (sl && inp) {
      if (state.tenureMode === 'years') {
        sl.max = 30; sl.value = state.tenureYears; inp.value = state.tenureYears; inp.max = 30;
      } else {
        sl.max = 360; sl.value = state.tenureMonths; inp.value = state.tenureMonths; inp.max = 360;
      }
      updateSliderFill(sl);
    }
    document.querySelectorAll('[data-tenure]').forEach(b => {
      const isActive = b.dataset.tenure === state.tenureMode;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-checked', isActive);
    });
  }
}

// ─── INIT ────────────────────────────────────────────
function init() {
  // Theme
  const savedTheme = localStorage.getItem('emi_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.querySelector('.icon-sun').style.display = savedTheme === 'dark' ? 'none' : 'block';
  document.querySelector('.icon-moon').style.display = savedTheme === 'dark' ? 'block' : 'none';

  // Load saved scenarios
  try { state.savedScenarios = JSON.parse(localStorage.getItem('emi_saved')) || []; } catch {}
  try { state.scenarios = JSON.parse(localStorage.getItem('emi_compare')) || []; } catch {}

  // Parse URL
  parseURL();

  // Bind
  bindInputs();
  bindKeyboard();

  // Initial render
  render();
}

document.addEventListener('DOMContentLoaded', init);
