/**
 * Universal Report Export Utility for CSV/Excel & Printable PDF
 */

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | boolean | null | undefined);
}

/**
 * Exports tabular data as a downloadable CSV/Excel compatible file
 */
export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  columns: ExportColumn<T>[],
  data: T[],
  title?: string,
  metadata?: Record<string, string | number>
) {
  const lines: string[] = [];

  // Optional Title & Metadata Header
  if (title) {
    lines.push(`"${title.replace(/"/g, '""')}"`);
    lines.push(`"Exported At:","${new Date().toLocaleString()}"`);
    if (metadata) {
      for (const [k, v] of Object.entries(metadata)) {
        lines.push(`"${k.replace(/"/g, '""')}","${String(v).replace(/"/g, '""')}"`);
      }
    }
    lines.push(""); // empty separator line
  }

  // Header Row
  const headerRow = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");
  lines.push(headerRow);

  // Data Rows
  for (const row of data) {
    const rowValues = columns.map((col) => {
      let val: any;
      if (typeof col.accessor === "function") {
        val = col.accessor(row);
      } else {
        val = row[col.accessor];
      }

      if (val === null || val === undefined) {
        return '""';
      }
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    lines.push(rowValues.join(","));
  }

  // UTF-8 BOM for proper Excel encoding
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename.endsWith(".csv") ? filename : `${filename}.csv`}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a clean print-ready report preview window with styled table & metadata
 */
export function exportToPrintPDF<T extends Record<string, any>>(
  reportTitle: string,
  columns: ExportColumn<T>[],
  data: T[],
  summaryCards?: Array<{ label: string; value: string | number }>,
  filtersSummary?: string
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export printable PDF reports.");
    return;
  }

  const tableHeaderHtml = columns
    .map((col) => `<th style="padding: 8px 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 11px; text-transform: uppercase; text-align: left;">${col.header}</th>`)
    .join("");

  const tableRowsHtml = data
    .map((row, idx) => {
      const cells = columns
        .map((col) => {
          let val: any;
          if (typeof col.accessor === "function") {
            val = col.accessor(row);
          } else {
            val = row[col.accessor];
          }
          return `<td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${val ?? "—"}</td>`;
        })
        .join("");
      const bg = idx % 2 === 0 ? "#ffffff" : "#fbfcfe";
      return `<tr style="background: ${bg};">${cells}</tr>`;
    })
    .join("");

  const summaryCardsHtml = summaryCards
    ? `<div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
        ${summaryCards
          .map(
            (c) => `
          <div style="flex: 1; min-width: 140px; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
            <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600;">${c.label}</div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 2px;">${c.value}</div>
          </div>
        `
          )
          .join("")}
      </div>`
    : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${reportTitle} - Official Export</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 15px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #047857; padding-bottom: 10px; }
          .title { font-size: 20px; font-weight: 800; color: #065f46; margin: 0 0 4px 0; }
          .subtitle { font-size: 11px; color: #64748b; margin: 0; }
          .meta { text-align: right; font-size: 11px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${reportTitle}</h1>
            <p class="subtitle">Travel Agency Workflow • Official Operational Management Report</p>
            ${filtersSummary ? `<p style="font-size: 10px; color: #047857; margin: 4px 0 0 0; font-weight: 600;">Active Filter: ${filtersSummary}</p>` : ""}
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            <div><strong>Total Records:</strong> ${data.length}</div>
          </div>
        </div>

        ${summaryCardsHtml}

        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml || `<tr><td colspan="${columns.length}" style="text-align: center; padding: 20px; color: #64748b;">No records match the selected filter criteria.</td></tr>`}
          </tbody>
        </table>

        <div class="footer">
          Confidential • Applicant Processing & Operations Report • Page 1 of 1
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
