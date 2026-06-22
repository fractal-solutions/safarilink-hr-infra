import { useState } from "react";
import {
  BookMarked,
  FolderOpen,
  Circle,
  CheckCircle2,
  ChevronDown,
  Pencil,
} from "lucide-react";
import type { PolicyDocument, UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface DocumentReaderProps {
  document: PolicyDocument | null;
  currentRole: UserRole;
  tracking: Record<string, boolean>;
  activeUserId: string;
  onToggleRead: (sectionId: string) => void;
  onEditSection: (sectionId: string) => void;
}

export function DocumentReader({
  document,
  currentRole,
  tracking,
  activeUserId,
  onToggleRead,
  onEditSection,
}: DocumentReaderProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  if (!document) {
    return (
      <div className="text-center py-16 text-slate-400">
        <BookMarked className="w-16 h-16 mx-auto mb-3 opacity-40" />
        <p className="font-medium">
          No active document selection framework running.
        </p>
      </div>
    );
  }

  if (document.sections.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
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
        const isRead = tracking[`${activeUserId}_${sec.id}`];
        const isOpen = openSections.has(sec.id);

        return (
          <div
            key={sec.id}
            className={cn(
              "rounded-xl border transition-all duration-200 bg-white overflow-hidden",
              isRead
                ? "border-emerald-200 bg-emerald-50/10"
                : "border-slate-200 shadow-xs"
            )}
          >
            <button
              onClick={() => toggleSection(sec.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 text-left transition-colors",
                isOpen ? "bg-slate-50" : "hover:bg-slate-50/50"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isRead ? "bg-emerald-500" : "bg-slate-300"
                  )}
                />
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {sec.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {currentRole === "admin" && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSection(sec.id);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                    title="Edit Section"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </span>
                )}
                <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                  {isRead ? "Done" : "Open"}
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-slate-400 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100">
                <div className="p-5 prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed space-y-2">
                  <div dangerouslySetInnerHTML={{ __html: sec.content }} />
                </div>

                <div className="px-5 pb-4 pt-1 border-t border-slate-100">
                  {currentRole !== "admin" ? (
                    <button
                      onClick={() => onToggleRead(sec.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                        isRead
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                          : "bg-sky-600 hover:bg-sky-700 text-white border border-sky-600"
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
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      Admin Read-Only
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
