import { useCallback } from 'react';
import jsPDF from 'jspdf';

/**
 * PDFExport — Generates a clean, branded one-page PDF summary.
 *
 * Uses jsPDF to create a professional document with:
 *  - Branded header with title and generation date
 *  - Key metrics (EMI, total interest, total payable)
 *  - Simple visual bar for principal vs interest split
 *  - Clean typography and layout
 */
export default function PDFExport({ mode, loanData, comparisonResults, schedule }) {
  const generatePDF = useCallback(() => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Color definitions (RGB)
    const primary = [13, 76, 74];
    const accent = [232, 168, 56];
    const ink = [26, 26, 46];
    const muted = [107, 114, 128];

    // Header
    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Loan EMI Calculator', margin, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 30);

    y = 55;

    if (mode === 'single' && loanData) {
      // Single loan summary
      doc.setTextColor(...ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Loan Summary', margin, y);
      y += 10;

      const fmt = (v) => `Rs. ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

      const metrics = [
        ['Loan Amount', fmt(loanData.principal)],
        ['Interest Rate', `${loanData.annualRate}% p.a.`],
        ['Tenure', `${loanData.tenureMonths} months`],
        ['Monthly EMI', fmt(loanData.emi)],
        ['Total Interest', fmt(loanData.totalInterest)],
        ['Total Payable', fmt(loanData.totalPayable)],
      ];

      doc.setFontSize(10);
      metrics.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...muted);
        doc.text(label, margin, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ink);
        doc.text(value, margin + contentWidth, y, { align: 'right' });
        y += 7;
      });

      y += 5;

      // Principal vs Interest bar
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...ink);
      doc.text('Principal vs Interest Split', margin, y);
      y += 8;

      const total = loanData.totalPayable;
      const principalPct = loanData.principal / total;
      const barHeight = 10;

      doc.setFillColor(220, 220, 220);
      doc.roundedRect(margin, y, contentWidth, barHeight, 3, 3, 'F');

      doc.setFillColor(...primary);
      doc.roundedRect(margin, y, contentWidth * principalPct, barHeight, 3, 3, 'F');

      doc.setFillColor(...accent);
      doc.roundedRect(margin + contentWidth * principalPct, y, contentWidth * (1 - principalPct), barHeight, 3, 3, 'F');

      y += barHeight + 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...primary);
      doc.text(`Principal: ${fmt(loanData.principal)} (${Math.round(principalPct * 100)}%)`, margin, y);
      doc.setTextColor(...accent);
      doc.text(`Interest: ${fmt(loanData.totalInterest)} (${Math.round((1 - principalPct) * 100)}%)`, pageWidth - margin, y, { align: 'right' });
    }

    if (mode === 'comparison' && comparisonResults) {
      // Comparison summary
      doc.setTextColor(...ink);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Loan Comparison', margin, y);
      y += 10;

      const validResults = comparisonResults.filter((r) => r.emi !== null);

      // Table header
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...muted);
      const colWidth = contentWidth / (validResults.length + 1);
      doc.text('Metric', margin, y);

      validResults.forEach((r, i) => {
        doc.text(r.label, margin + colWidth * (i + 1), y, { align: 'right' });
      });
      y += 2;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;

      const fmt = (v) => `Rs. ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

      const rows = [
        ['EMI', (r) => fmt(r.emi)],
        ['Total Interest', (r) => fmt(r.totalInterest)],
        ['Total Payable', (r) => fmt(r.totalPayable)],
      ];

      doc.setFontSize(9);
      rows.forEach(([label, fn]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...muted);
        doc.text(label, margin, y);
        validResults.forEach((r, i) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...ink);
          doc.text(fn(r), margin + colWidth * (i + 1), y, { align: 'right' });
        });
        y += 6;
      });

      y += 5;

      // Delta callout
      if (validResults.length >= 2) {
        const first = validResults[0];
        const second = validResults[1];
        const interestDiff = second.totalInterest - first.totalInterest;

        doc.setFillColor(240, 244, 244);
        doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
        y += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...ink);
        const diffText = interestDiff > 0
          ? `${second.label} costs Rs. ${Math.abs(interestDiff).toLocaleString('en-IN', { maximumFractionDigits: 0 })} more in total interest than ${first.label}.`
          : `${first.label} costs Rs. ${Math.abs(interestDiff).toLocaleString('en-IN', { maximumFractionDigits: 0 })} more in total interest than ${second.label}.`;
        doc.text(diffText, margin + 3, y);
      }

      y += 25;

      // Bar chart comparison
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...ink);
      doc.text('Total Cost Comparison', margin, y);
      y += 8;

      const maxTotal = Math.max(...validResults.map((r) => r.totalPayable));
      const barH = 8;

      validResults.forEach((r, i) => {
        const barW = (r.totalPayable / maxTotal) * (contentWidth - 60);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.text(r.label, margin, y + barH / 2 + 1);

        doc.setFillColor(220, 220, 220);
        doc.roundedRect(margin + 55, y, contentWidth - 55, barH, 2, 2, 'F');

        const colors = [primary, accent, [124, 58, 237]];
        doc.setFillColor(...colors[i % colors.length]);
        doc.roundedRect(margin + 55, y, barW, barH, 2, 2, 'F');

        doc.setFontSize(7);
        doc.setTextColor(...ink);
        doc.text(fmt(r.totalPayable), margin + 55 + barW + 3, y + barH / 2 + 1);

        y += barH + 5;
      });
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(
      'Loan EMI Calculator — Portfolio Project',
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      'Formula: EMI = [P x R x (1+R)^N] / [(1+R)^N - 1]',
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );

    doc.save(`emi-calculation-${Date.now()}.pdf`);
  }, [mode, loanData, comparisonResults, schedule]);

  return (
    <button
      onClick={generatePDF}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light active:bg-primary-dark transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export PDF
    </button>
  );
}
