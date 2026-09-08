import * as pdfjs from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = "/assets/pdf.worker.min.mjs";

interface PdfViewerProps {
  url: string;
  fallbackName?: string;
  chrome?: boolean;
  tall?: boolean;
}

export function PdfViewer({ url, fallbackName, chrome = true, tall = false }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [rendered, setRendered] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileName = fallbackName || url.split("/").pop() || "document.pdf";

  useEffect(() => {
    let cancelled = false;
    let task: any = null;
    let pdf: any = null;
    const holder = pagesRef.current;
    setNumPages(0);
    setRendered(0);
    setError(null);

    const run = async () => {
      try {
        task = pdfjs.getDocument({ url, disableAutoFetch: false });
        pdf = await task.promise;
        if (cancelled) return;
        setNumPages(pdf.numPages);
        if (!holder) return;
        const available = Math.max(280, Math.min(holder.clientWidth - 32 || 800, 1200));
        const dpr = window.devicePixelRatio || 1;
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          if (cancelled) {
            page.cleanup();
            return;
          }
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(available / base.width, 2.5);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(vp.width * dpr));
          canvas.height = Math.max(1, Math.floor(vp.height * dpr));
          canvas.style.width = `${Math.floor(vp.width)}px`;
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          canvas.className = "rounded-sm shadow-md bg-white";
          const wrapper = document.createElement("div");
          wrapper.className = "mx-auto mb-3 last:mb-0";
          wrapper.style.width = "fit-content";
          wrapper.style.maxWidth = "100%";
          wrapper.appendChild(canvas);
          if (!cancelled && holder) {
            holder.appendChild(wrapper);
          }
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({
              canvasContext: ctx,
              viewport: vp,
              transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
            }).promise;
          }
          page.cleanup();
          if (!cancelled) setRendered((r) => r + 1);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load this document.");
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      try {
        task?.destroy();
      } catch {
        // ignore
      }
      if (holder) holder.innerHTML = "";
    };
  }, [url]);

  const downloading = rendered < numPages && numPages > 0;
  const showChrome = chrome !== false;

  return (
    <div className={cn(showChrome && "p-5")}>
      <div
        className={cn(
          "rounded-xl border border-sf-cream-dark dark:border-slate-700 bg-slate-100 dark:bg-slate-950 overflow-hidden",
          !showChrome && "rounded-none border-0"
        )}
      >
        {showChrome && (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-sf-cream-dark dark:border-slate-700">
            <div className="flex items-center gap-2 min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <FileText className="w-4 h-4 text-sf-brown dark:text-sf-gold shrink-0" />
              <span className="truncate">{fileName}</span>
              {numPages > 0 && (
                <span className="text-slate-400 font-normal shrink-0">
                  {rendered}/{numPages}
                </span>
              )}
            </div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-sf-cream-dark dark:border-slate-600 rounded-lg hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3 h-3" /> Open
            </a>
          </div>
        )}

        <div
          ref={containerRef}
          className={cn(
            tall ? "overflow-visible" : "max-h-[68vh] overflow-x-auto overflow-y-auto",
            showChrome ? "p-4" : "p-2 sm:p-4"
          )}
        >
          {error ? (
            <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
              <p className="font-medium mb-1">Preview unavailable</p>
              <p className="text-xs">{error}</p>
            </div>
          ) : (
            <>
              <div ref={pagesRef} className="space-y-0" />
              {rendered < numPages && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {downloading ? `Rendering page ${rendered + 1} of ${numPages}…` : "Loading document…"}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {showChrome && (
        <p className="text-[11px] text-slate-400 mt-2">
          Scroll to read. Use fullscreen (top-right of the section) for a larger view.
        </p>
      )}
    </div>
  );
}
