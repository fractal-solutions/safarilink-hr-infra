import { useState, useEffect } from "react";
import {
  BookMarked,
  FolderOpen,
  Circle,
  CheckCircle2,
  ChevronDown,
  Pencil,
  History,
  Presentation,
  FileDown,
  Video,
  FileText,
  Maximize2,
} from "lucide-react";
import type { PolicyDocument, UserRole, Section } from "@/types";
import { cn } from "@/lib/utils";
import { VideoSection } from "./VideoSection";
import { PdfViewer } from "./PdfViewer";
import { SectionFullscreen } from "./SectionFullscreen";

interface DocumentReaderProps {
  document: PolicyDocument | null;
  currentRole: UserRole;
  tracking: Record<string, boolean>;
  activeUserId: string;
  onToggleRead: (sectionId: string) => void;
  onMarkCompleted?: (sectionId: string) => void;
  onEditSection: (sectionId: string) => void;
  onViewVersions?: (sectionId: string) => void;
}

export function DocumentReader({
  document,
  currentRole,
  tracking,
  activeUserId,
  onToggleRead,
  onMarkCompleted,
  onEditSection,
  onViewVersions,
}: DocumentReaderProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [fullscreenSection, setFullscreenSection] = useState<Section | null>(null);

  useEffect(() => {
    setOpenSections(new Set());
    setFullscreenSection(null);
  }, [document?.id]);

  if (!document) {
    return (
      <div className="text-center py-16 text-slate-400 dark:text-slate-500">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <BookMarked className="w-8 h-8 opacity-40" />
        </div>
        <p className="font-medium">
          No active document selection framework running.
        </p>
      </div>
    );
  }

  if (document.sections.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500 border-2 border-dashed border-sf-cream-dark dark:border-slate-700 rounded-xl">
        <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-40" />
        <p className="text-sm">
          This compliance framework contains no section records yet.
        </p>
      </div>
    );
  }

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {document.sections.map((sec) => {
        const isRead = !!tracking[sec.id];
        const isOpen = openSections.has(sec.id);
        const secType = sec.type || "richtext";

        const renderBody = () => {
          if (secType === "video") {
            return sec.url ? (
              <VideoSection
                sectionId={sec.id}
                url={sec.url}
                size={sec.size ?? "large"}
                currentRole={currentRole}
                isRead={isRead}
                onMarkCompleted={(id) => onMarkCompleted?.(id)}
              />
            ) : (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                <Video className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">This video section has no media attached yet.</p>
              </div>
            );
          }
          if (secType === "pdf") {
            return sec.url ? (
              <PdfViewer url={sec.url} />
            ) : (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">This PDF section has no file attached yet.</p>
              </div>
            );
          }
          if (secType === "slides") {
            if (sec.url) return <PdfViewer url={sec.url} fallbackName={sec.originalUrl?.split("/").pop()} />;
            if (sec.originalUrl) {
              return (
                <div className="p-6">
                  <div className="rounded-xl border border-sf-cream-dark dark:border-slate-700 bg-sf-cream dark:bg-slate-800 p-6 text-center">
                    <Presentation className="w-10 h-10 mx-auto mb-2 text-sf-brown dark:text-sf-gold" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Presentation preview unavailable
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      The server could not convert this PowerPoint to a viewable preview.
                    </p>
                    <a
                      href={sec.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sf-brown hover:bg-sf-brown-dark text-white text-xs font-semibold transition-colors"
                    >
                      <FileDown className="w-4 h-4" /> Download original (.pptx)
                    </a>
                  </div>
                </div>
              );
            }
            return (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                <Presentation className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">This presentation section has no file attached yet.</p>
              </div>
            );
          }
          return (
            <div className="p-5 prose prose-slate dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
              <div dangerouslySetInnerHTML={{ __html: sec.content || "" }} />
            </div>
          );
        };

        return (
          <div
            key={sec.id}
            className={cn(
              "rounded-xl border transition-all duration-200 overflow-hidden",
              isRead
                ? "border-sf-gold/30 bg-sf-gold/5 dark:bg-sf-gold/5"
                : "border-sf-cream-dark dark:border-slate-700 shadow-xs",
              "bg-white dark:bg-slate-800"
            )}
          >
            <button
              onClick={() => toggleSection(sec.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 text-left transition-colors",
                isOpen
                  ? "bg-sf-cream dark:bg-slate-800"
                  : "hover:bg-sf-cream-dark dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isRead ? "bg-sf-gold" : "bg-slate-300 dark:bg-slate-600"
                  )}
                />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {sec.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenSection(sec);
                  }}
                  className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-sf-brown dark:hover:text-sf-gold hover:bg-sf-cream dark:hover:bg-sf-brown/20 transition-colors"
                  title="View fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </span>
                {currentRole === "admin" && onViewVersions && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewVersions(sec.id);
                    }}
                    className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-sf-brown dark:hover:text-sf-gold hover:bg-sf-cream dark:hover:bg-sf-brown/20 transition-colors"
                    title="Version History"
                  >
                    <History className="w-3.5 h-3.5" />
                  </span>
                )}
                {currentRole === "admin" && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSection(sec.id);
                    }}
                    className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-sf-brown dark:hover:text-sf-gold hover:bg-sf-cream dark:hover:bg-sf-brown/20 transition-colors"
                    title="Edit Section"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </span>
                )}
                <span className={cn(
                  "text-[11px] font-medium tabular-nums",
                  isRead ? "text-sf-gold-dark" : "text-slate-400 dark:text-slate-500"
                )}>
                  {isRead ? "Done" : "Open"}
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-sf-cream-dark dark:border-slate-700">
                {renderBody()}

                <div className="px-5 pb-4 pt-1 border-t border-sf-cream-dark dark:border-slate-700">
                  {currentRole !== "admin" ? (
                    <button
                      onClick={() => onToggleRead(sec.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                        isRead
                          ? "bg-sf-gold/15 dark:bg-sf-gold/10 text-sf-brown-dark dark:text-sf-gold border border-sf-gold/30 dark:border-sf-gold/20 hover:bg-sf-gold/25 dark:hover:bg-sf-gold/15"
                          : "bg-sf-brown hover:bg-sf-brown-dark text-white border border-sf-brown"
                      )}
                    >
                      {isRead ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                      {isRead
                        ? "Completed — Click to Unmark"
                        : "I have read this section"}
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-sf-cream dark:bg-slate-700 text-sf-brown-light dark:text-slate-400 border border-sf-cream-dark dark:border-slate-600">
                      Admin Read-Only
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {fullscreenSection && (
        <SectionFullscreen
          section={fullscreenSection}
          currentRole={currentRole}
          isRead={!!tracking[fullscreenSection.id]}
          onMarkCompleted={onMarkCompleted}
          onClose={() => setFullscreenSection(null)}
        />
      )}
    </div>
  );
}
