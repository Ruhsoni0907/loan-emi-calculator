import { useCallback } from 'react';
import jsPDF from 'jspdf';
import { formatINR } from '../lib/emiEngine.js';

/**
 * PDFExport — Generates a professional branded one-page PDF.
 */
export default function PDFExport({ mode, loanData, comparisonResults }) {
  const generatePDF = useCallback(() => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // Colors (RGB)
    const primary = [10, 37, 64];
    const accent = [0, 212, 170];
    const accentWarm = [255, 107, 53];
    const ink = [10, 37, 64];
    const muted = [84, 110, 122];
    const faint = [144, 164, 174];
    const light = [246, 249, 252];

    // === HEADER ===
    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Accent line
    doc.setFillColor(...accent);
    doc.rect(0, 35, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('EMI Calculator', margin, 16);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text('Loan Amortization Summary', margin, 24);

    // Date
    doc.setFontSize(8);
    doc.text(
      new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      pageWidth - margin,
      16,
      { align: 'right' }
    );

    y = 48;

    if (mode === 'single' && loanData) {
      // === LOAN OVERVIEW ===
      doc.setFillColor(...light);
      doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...ink);
      doc.text('Loan Overview', margin + 5, y + 8);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...muted);

      const overviewItems = [
        { label: 'Amount', value: formatINR(loanData.principal, false) },
        { label: 'Rate', value: `${loanData.annualRate}% p.a.` },
        { label: 'Tenure', value: `${loanData.tenureMonths} months` },
      ];

      overviewItems.forEach((item, i) => {
        const xPos = margin + 5 + i * (contentWidth / 3);
        doc.text(item.label, xPos, y + 16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ink);
        doc.text(item.value, xPos, y + 22);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...muted);
      });

      y += 36;

      // === KEY RESULTS ===
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...ink);
      doc.text('Key Results', margin, y);
      y += 8;

      // EMI highlight box
      doc.setFillColor(...accent);
      doc.roundedRect(margin, y, contentWidth, 16, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('MONTHLY EMI', margin + 5, y + 6.5);
      doc.setFontSize(14);
      doc.text(formatINR(loanData.emi, false), margin + 5, y + 13);
      y += 22;

      // Metrics row
      const metrics = [
        { label: 'Total Interest', value: formatINR(loanData.totalInterest, false), color: accentWarm },
        { label: 'Total Payable', value: formatINR(loanData.totalPayable, false), color: primary },
      ];

      metrics.forEach((m, i) => {
        const boxW = (contentWidth - 5) / 2;
        const xPos = margin + i * (boxW + 5);

        doc.setFillColor(...light);
        doc.roundedRect(xPos, y, boxW, 14, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text(m.label, xPos + 4, y + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...m.color);
        doc.text(m.value, xPos + 4, y + 11);
      });

      y += 20;

      // === SPLIT BAR ===
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...ink);
      doc.text('Principal vs Interest', margin, y);
      y += 6;

      const total = loanData.totalPayable;
      const principalPct = loanData.principal / total;
      const barH = 8;

      doc.setFillColor(230, 230, 230);
      doc.roundedRect(margin, y, contentWidth, barH, 3, 3, 'F');

      doc.setFillColor(...primary);
      doc.roundedRect(margin, y, contentWidth * principalPct, barH, 3, 3, 'F');

      doc.setFillColor(...accentWarm);
      doc.roundedRect(margin + contentWidth * principalPct, y, contentWidth * (1 - principalPct), barH, 3, 3, 'F');

      y += barH + 4;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...primary);
      doc.text(`Principal: ${formatINR(loanData.principal, false)} (${Math.round(principalPct * 100)}%)`, margin, y);
      doc.setTextColor(...accentWarm);
      doc.text(`Interest: ${formatINR(loanData.totalInterest, false)} (${Math.round((1 - principalPct) * 100)}%)`, pageWidth - margin, y, { align: 'right' });
    }

    if (mode === 'comparison' && comparisonResults) {
      const validResults = comparisonResults.filter((r) => r.emi !== null);

      // === COMPARISON TABLE ===
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...ink);
      doc.text('Loan Comparison', margin, y);
      y += 8;

      // Table
      const colWidth = contentWidth / (validResults.length + 1);

      // Header
      doc.setFillColor(...light);
      doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text('Metric', margin + 3, y + 5.5);
      validResults.forEach((r, i) => {
        doc.text(r.label, margin + colWidth * (i + 1) + 3, y + 5.5);
      });
      y += 10;

      // Rows
      const rows = [
        ['EMI', (r) => formatINR(r.emi, false)],
        ['Interest', (r) => formatINR(r.totalInterest, false)],
        ['Total', (r) => formatINR(r.totalPayable, false)],
      ];

      rows.forEach(([label, fn], ri) => {
        if (ri % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(margin, y - 1, contentWidth, 7, 1, 1, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text(label, margin + 3, y + 4);
        validResults.forEach((r, i) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...ink);
          doc.text(fn(r), margin + colWidth * (i + 1) + 3, y + 4);
        });
        y += 7;
      });

      y += 5;

      // Delta callout
      if (validResults.length >= 2) {
        const first = validResults[0];
        const second = validResults[1];
        const diff = second.totalInterest - first.totalInterest;

        doc.setFillColor(240, 244, 248);
        doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
        y += 5;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...ink);
        const text = diff > 0
          ? `${second.label} costs ${formatINR(Math.abs(diff), false)} more in interest than ${first.label}.`
          : `${first.label} costs ${formatINR(Math.abs(diff), false)} more in interest than ${second.label}.`;
        doc.text(text, margin + 4, y + 4);
        y += 14;
      }

      y += 5;

      // Bar chart
      const maxTotal = Math.max(...validResults.map((r) => r.totalPayable));
      const barH = 6;
      const colors = [primary, accent, accentWarm];

      validResults.forEach((r, i) => {
        const barW = (r.totalPayable / maxTotal) * (contentWidth - 50);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text(r.label, margin, y + barH / 2 + 1);

        doc.setFillColor(230, 230, 230);
        doc.roundedRect(margin + 40, y, contentWidth - 50, barH, 2, 2, 'F');

        doc.setFillColor(...(colors[i % colors.length]));
        doc.roundedRect(margin + 40, y, barW, barH, 2, 2, 'F');

        doc.setFontSize(6);
        doc.setTextColor(...ink);
        doc.text(formatINR(r.totalPayable, false), margin + 40 + barW + 3, y + barH / 2 + 1);

        y += barH + 4;
      });
    }

    // === FOOTER ===
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFontSize(6);
    doc.setTextColor(...faint);
    doc.text('Generated by EMI Calculator', margin, pageHeight - 10);
    doc.text('Formula: EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]', pageWidth - margin, pageHeight - 10, { align: 'right' });

    doc.save(`emi-report-${Date.now()}.pdf`);
  }, [mode, loanData, comparisonResults]);

  return (
    <button
      onClick={generatePDF}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-light active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      Export PDF
    </button>
  );
}
