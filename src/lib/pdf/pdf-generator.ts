import { jsPDF } from "jspdf";
import type { GeneratedPdfContent } from "@/routes/api/pdf";

export interface PdfStyleOptions {
  theme?: "corporate" | "teal" | "executive" | "minimal" | "emerald";
  pageSize?: "a4" | "letter";
  showPageNumbers?: boolean;
}

const THEME_COLORS: Record<
  string,
  {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
    bgLight: [number, number, number];
  }
> = {
  corporate: {
    primary: [15, 44, 89], // Deep Navy
    secondary: [70, 80, 95], // Slate
    accent: [0, 150, 214], // Vibrant Cyan
    bgLight: [244, 247, 252], // Off-white blue
  },
  teal: {
    primary: [13, 71, 79], // Deep Teal
    secondary: [60, 90, 95],
    accent: [20, 184, 166], // Mint / Teal
    bgLight: [240, 253, 250],
  },
  executive: {
    primary: [24, 24, 27], // Charcoal
    secondary: [82, 82, 91],
    accent: [168, 85, 247], // Purple
    bgLight: [250, 250, 250],
  },
  minimal: {
    primary: [17, 24, 39], // Slate 900
    secondary: [100, 116, 139],
    accent: [59, 130, 246], // Blue
    bgLight: [248, 250, 252],
  },
  emerald: {
    primary: [6, 78, 59], // Emerald 900
    secondary: [52, 78, 65],
    accent: [16, 185, 129], // Emerald 500
    bgLight: [236, 253, 245],
  },
};

export function generatePdfDocument(
  data: GeneratedPdfContent,
  options: PdfStyleOptions = {},
): { doc: jsPDF; download: (filename?: string) => void; getBlob: () => Blob } {
  const theme = THEME_COLORS[options.theme || "corporate"] || THEME_COLORS.corporate;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: options.pageSize === "letter" ? "letter" : "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  function checkPageBreak(requiredHeight: number) {
    if (currentY + requiredHeight > pageHeight - margin - 10) {
      doc.addPage();
      currentY = margin + 5;
    }
  }

  // Header Banner
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, pageWidth, 5, "F");

  currentY += 8;

  // Document Category / Subtitle
  if (data.subtitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...theme.accent);
    doc.text(data.subtitle.toUpperCase(), margin, currentY);
    currentY += 5;
  }

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...theme.primary);
  const titleLines = doc.splitTextToSize(data.title || "Document", contentWidth);
  doc.text(titleLines, margin, currentY);
  currentY += titleLines.length * 8 + 3;

  // Metadata Bar (Author, Date, Category)
  doc.setFillColor(...theme.bgLight);
  doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...theme.secondary);

  const metaText = `Author: ${data.author || "Bravura AI"}  •  Date: ${data.date || new Date().toLocaleDateString()}  •  Type: ${(data.documentType || "Report").toUpperCase()}`;
  doc.text(metaText, margin + 4, currentY + 7.5);
  currentY += 18;

  // Executive Summary Box
  if (data.summary) {
    checkPageBreak(30);
    doc.setFillColor(...theme.bgLight);
    doc.setDrawColor(...theme.accent);
    doc.setLineWidth(0.8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...theme.primary);
    doc.text("Executive Summary", margin, currentY);
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const summaryLines = doc.splitTextToSize(data.summary, contentWidth - 8);
    const boxHeight = summaryLines.length * 4.8 + 6;

    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, "F");
    doc.line(margin, currentY, margin, currentY + boxHeight); // Left accent border
    doc.text(summaryLines, margin + 4, currentY + 5);
    currentY += boxHeight + 8;
  }

  // Key Metadata Fields if any
  if (Array.isArray(data.metaFields) && data.metaFields.length > 0) {
    checkPageBreak(18);
    const colWidth = contentWidth / Math.min(data.metaFields.length, 3);
    data.metaFields.slice(0, 3).forEach((field, idx) => {
      const colX = margin + idx * colWidth;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...theme.secondary);
      doc.text(field.label.toUpperCase(), colX, currentY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...theme.primary);
      doc.text(field.value, colX, currentY + 5);
    });
    currentY += 14;
  }

  // Sections
  if (Array.isArray(data.sections)) {
    for (const section of data.sections) {
      checkPageBreak(25);

      // Section Heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...theme.primary);
      doc.text(section.heading, margin, currentY);
      currentY += 2;

      // Subtle divider line
      doc.setDrawColor(220, 225, 230);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY + 1, margin + contentWidth, currentY + 1);
      currentY += 5;

      // Section Paragraph Content
      if (section.content) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 40);
        const pLines = doc.splitTextToSize(section.content, contentWidth);
        checkPageBreak(pLines.length * 4.5);
        doc.text(pLines, margin, currentY);
        currentY += pLines.length * 4.5 + 4;
      }

      // Callout highlight
      if (section.callout) {
        checkPageBreak(18);
        doc.setFillColor(...theme.bgLight);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...theme.primary);
        const calloutLines = doc.splitTextToSize(`Note: ${section.callout}`, contentWidth - 10);
        const cHeight = calloutLines.length * 4.5 + 5;
        doc.roundedRect(margin, currentY, contentWidth, cHeight, 1.5, 1.5, "F");
        doc.text(calloutLines, margin + 5, currentY + 4);
        currentY += cHeight + 4;
      }

      // Bullets
      if (Array.isArray(section.bullets) && section.bullets.length > 0) {
        for (const bullet of section.bullets) {
          checkPageBreak(10);
          doc.setFillColor(...theme.accent);
          doc.circle(margin + 2, currentY - 1.2, 1, "F");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(45, 45, 45);
          const bLines = doc.splitTextToSize(bullet, contentWidth - 8);
          doc.text(bLines, margin + 6, currentY);
          currentY += bLines.length * 4.2 + 2;
        }
        currentY += 2;
      }

      // Table
      if (
        section.table &&
        Array.isArray(section.table.headers) &&
        Array.isArray(section.table.rows)
      ) {
        const { headers, rows } = section.table;
        const colCount = Math.max(headers.length, 1);
        const colW = contentWidth / colCount;
        const rowH = 7;

        checkPageBreak(rowH * (rows.length + 1) + 8);

        // Header row
        doc.setFillColor(...theme.primary);
        doc.rect(margin, currentY, contentWidth, rowH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);

        headers.forEach((h, i) => {
          doc.text(String(h), margin + i * colW + 2, currentY + 4.8);
        });
        currentY += rowH;

        // Data rows
        rows.forEach((row, rIdx) => {
          checkPageBreak(rowH);
          if (rIdx % 2 === 1) {
            doc.setFillColor(...theme.bgLight);
            doc.rect(margin, currentY, contentWidth, rowH, "F");
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(40, 40, 40);

          row.forEach((cell, cIdx) => {
            const cellText = doc.splitTextToSize(String(cell), colW - 4);
            doc.text(cellText[0] || "", margin + cIdx * colW + 2, currentY + 4.8);
          });

          // Row bottom border
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.2);
          doc.line(margin, currentY + rowH, margin + contentWidth, currentY + rowH);
          currentY += rowH;
        });

        currentY += 6;
      }

      currentY += 4;
    }
  }

  // Conclusion
  if (data.conclusion) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...theme.primary);
    doc.text("Conclusion & Next Steps", margin, currentY);
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 40);
    const concLines = doc.splitTextToSize(data.conclusion, contentWidth);
    doc.text(concLines, margin, currentY);
    currentY += concLines.length * 4.5 + 8;
  }

  // Page Numbers and Running Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...theme.secondary);

    // Footer divider line
    doc.setDrawColor(225, 230, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    const footerText = data.footerNotes || `Generated by Bravura AI Document Engine`;
    doc.text(footerText, margin, pageHeight - 8);

    if (options.showPageNumbers !== false) {
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 8);
    }
  }

  return {
    doc,
    download: (filename?: string) => {
      const cleanName = (filename || data.title || "document")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-");
      doc.save(`${cleanName}.pdf`);
    },
    getBlob: () => doc.output("blob"),
  };
}
