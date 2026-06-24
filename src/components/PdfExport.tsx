import { Printer } from "lucide-react";
import type { PolicyDocument } from "@/types";

interface PdfExportProps {
  document: PolicyDocument;
}

export function PdfExport({ document: doc }: PdfExportProps) {
  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.title}</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.6; }
          h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; border-bottom: 2px solid #5C3A1E; padding-bottom: 0.5rem; color: #5C3A1E; }
          h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #C8A951; }
          .section { page-break-inside: avoid; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #F5EDE0; }
          .section:last-child { border-bottom: none; }
          .content { font-size: 0.9rem; }
          .content p { margin: 0.5em 0; }
          .content strong { font-weight: 700; }
          .meta { font-size: 0.75rem; color: #94a3b8; margin-top: 2rem; }
        </style>
      </head>
      <body>
        <h1>${doc.title}</h1>
        ${doc.sections.map(sec => `
          <div class="section">
            <h2>${sec.title}</h2>
            <div class="content">${sec.content}</div>
          </div>
        `).join("")}
        <p class="meta">Generated on ${new Date().toLocaleDateString()} | Safarilink HR Compliance Portal</p>
      </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-sf-cream dark:bg-slate-700 hover:bg-sf-cream-dark dark:hover:bg-slate-600 rounded-lg transition-colors"
      title="Export as PDF"
    >
      <Printer className="w-4 h-4" />
      <span className="hidden sm:inline">Export PDF</span>
    </button>
  );
}
