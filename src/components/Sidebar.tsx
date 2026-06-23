import { useState, useRef } from "react";
import { BookOpen, ChevronRight, Plus, GripVertical, Calendar, Archive, X, Tag } from "lucide-react";
import type { PolicyDocument, UserRole } from "@/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  documents: PolicyDocument[];
  activeDocId: string | null;
  currentRole: UserRole;
  tracking: Record<string, boolean>;
  activeUserId: string;
  onSelectDoc: (docId: string) => void;
  onCreateDoc: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  searchQuery?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  documents,
  activeDocId,
  currentRole,
  tracking,
  activeUserId,
  onSelectDoc,
  onCreateDoc,
  onReorder,
  searchQuery = "",
  isOpen = false,
  onClose,
}: SidebarProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragCounter = useRef<number[]>([]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current[index] = (dragCounter.current[index] || 0) + 1;
    if (dragIndex !== null && index !== dragIndex) {
      setDropIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    dragCounter.current[index] = (dragCounter.current[index] || 0) - 1;
    if (dragCounter.current[index] <= 0) {
      dragCounter.current[index] = 0;
      if (dropIndex === index) setDropIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndex;
    if (fromIndex !== null && fromIndex !== toIndex) onReorder(fromIndex, toIndex);
    setDragIndex(null);
    setDropIndex(null);
    dragCounter.current = [];
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
    dragCounter.current = [];
  };

  const canDrag = currentRole === "admin";

  const filteredDocs = searchQuery.trim()
    ? documents.filter((doc) => {
        const q = searchQuery.toLowerCase();
        if (doc.title.toLowerCase().includes(q)) return true;
        return doc.sections.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.content.toLowerCase().includes(q)
        );
      })
    : documents;

  const sidebarContent = (
    <aside className={cn(
      "w-full sm:w-1/4 sm:min-w-[280px] bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 p-4 flex flex-col min-h-0",
      !isOpen && "hidden sm:flex"
    )}>
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-wide uppercase flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-600" /> Policy Manuals
        </h2>
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="sm:hidden p-1.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          {currentRole === "admin" && (
            <button
              onClick={onCreateDoc}
              className="bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-800/50 text-sky-700 dark:text-sky-400 p-1.5 rounded-lg border border-sky-200 dark:border-sky-700 transition-colors"
              title="Create New Document"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
        {filteredDocs.length === 0 && searchQuery.trim() && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
            No results for "{searchQuery}"
          </p>
        )}
        {filteredDocs.map((doc, index) => {
          const totalSec = doc.sections.length;
          let readSec = 0;
          doc.sections.forEach((s) => {
            if (tracking[s.id]) readSec++;
          });
          const pct = totalSec > 0 ? Math.round((readSec / totalSec) * 100) : 0;
          const isActive = activeDocId === doc.id;
          const isDragging = dragIndex === index;
          const isDropTarget = dropIndex === index;

          return (
            <div
              key={doc.id}
              draggable={canDrag}
              onDragStart={(e) => canDrag && handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={(e) => handleDragLeave(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "rounded-lg border transition-all duration-150",
                isDragging && "opacity-40 scale-95",
                isDropTarget && !isDragging && "border-sky-400 border-dashed bg-sky-50/50 ring-2 ring-sky-200 dark:ring-sky-700",
                !isDragging && !isDropTarget && "border-transparent"
              )}
            >
              <button
                onClick={() => { onSelectDoc(doc.id); onClose?.(); }}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1.5",
                  isActive
                    ? "bg-sky-50 dark:bg-sky-900/40 border-sky-300 dark:border-sky-600 text-sky-950 dark:text-sky-100 font-medium ring-1 ring-sky-300 dark:ring-sky-600"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                )}
              >
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {canDrag && (
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0 cursor-grab active:cursor-grabbing" />
                    )}
                    <span className="text-sm font-semibold pr-2 leading-tight truncate">
                      {doc.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {doc.archived === 1 && (
                      <Archive className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5" />
                  </div>
                </div>

                {doc.due_date && (
                  <div className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400">
                    <Calendar className="w-3 h-3" />
                    <span>Due {new Date(doc.due_date).toLocaleDateString()}</span>
                  </div>
                )}

                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                    {doc.tags.length > 3 && (
                      <span className="text-[9px] text-slate-400">+{doc.tags.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-sky-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 w-full font-normal">
                  <span>{totalSec} section{totalSec !== 1 ? "s" : ""}</span>
                  <span className="font-medium text-slate-500 dark:text-slate-400">{pct}% Read</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );

  return sidebarContent;
}
