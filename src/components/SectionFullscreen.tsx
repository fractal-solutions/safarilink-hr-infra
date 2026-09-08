import { useEffect, useRef, useState } from "react";
import { X, Maximize2, Minimize2, ExternalLink, Presentation, Video } from "lucide-react";
import type { Section, SectionType, UserRole } from "@/types";
import { PdfViewer } from "./PdfViewer";
import { VideoSection } from "./VideoSection";
import { cn } from "@/lib/utils";

interface SectionFullscreenProps {
  section: Section;
  currentRole: UserRole;
  isRead: boolean;
  onMarkCompleted?: (sectionId: string) => void;
  onClose: () => void;
}

export function SectionFullscreen({
  section,
  currentRole,
  isRead,
  onMarkCompleted,
  onClose,
}: SectionFullscreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isNativeFs, setIsNativeFs] = useState(false);
  const type: SectionType = section.type || "richtext";

  useEffect(() => {
    const onFsChange = () => setIsNativeFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const toggleNativeFs = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await rootRef.current?.requestFullscreen?.();
      }
    } catch {
      // ignore fullscreen permission errors
    }
  };

  const externalUrl =
    type === "richtext"
      ? null
      : type === "slides"
        ? section.url || section.originalUrl || null
        : section.url || null;

  const renderBody = () => {
    if (type === "video") {
      return section.url ? (
        <VideoSection
          sectionId={section.id}
          url={section.url}
          size={section.size ?? "large"}
          currentRole={currentRole}
          isRead={isRead}
          onMarkCompleted={(id) => onMarkCompleted?.(id)}
        />
      ) : (
        <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
          <div className="text-center">
            <Video className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">This video section has no media attached yet.</p>
          </div>
        </div>
      );
    }
    if (type === "pdf" && section.url) {
      return <PdfViewer url={section.url} chrome={false} tall />;
    }
    if (type === "slides") {
      if (section.url) {
        return <PdfViewer url={section.url} fallbackName={section.originalUrl?.split("/").pop()} chrome={false} tall />;
      }
      if (section.originalUrl) {
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Presentation className="w-12 h-12 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Presentation preview unavailable
              </p>
              <p className="text-xs text-slate-400 mb-4">
                The server could not convert this PowerPoint to a viewable preview.
              </p>
              <a
                href={section.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sf-brown hover:bg-sf-brown-dark text-white text-xs font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Download original (.pptx)
              </a>
            </div>
          </div>
        );
      }
      return null;
    }
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 prose prose-slate dark:prose-invert text-slate-600 dark:text-slate-300 leading-relaxed">
        <div dangerouslySetInnerHTML={{ __html: section.content || "" }} />
      </div>
    );
  };

  return (
    <div ref={rootRef} className="fixed inset-0 z-[95] bg-white dark:bg-slate-900 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-sf-cream-dark dark:border-slate-700 bg-sf-cream/60 dark:bg-slate-900">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="truncate text-sm font-bold text-sf-brown dark:text-slate-100">
            {section.title}
          </span>
          <span className="shrink-0 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-sf-gold/15 text-sf-brown-dark dark:text-sf-gold border border-sf-gold/20">
            {type}
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 border border-sf-cream-dark dark:border-slate-700 rounded-lg hover:bg-sf-cream dark:hover:bg-slate-800 transition-colors"
              title="Open file in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          )}
          <button
            onClick={toggleNativeFs}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-sf-brown dark:hover:text-sf-gold hover:bg-sf-cream dark:hover:bg-slate-800 transition-colors"
            title={isNativeFs ? "Exit fullscreen" : "Fullscreen"}
          >
            {isNativeFs ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-sf-cream dark:hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className={cn("flex-1 min-h-0 overflow-auto", type === "richtext" ? "bg-sf-cream/40 dark:bg-slate-950" : "bg-slate-100 dark:bg-slate-950")}>
        {renderBody()}
      </div>
    </div>
  );
}
