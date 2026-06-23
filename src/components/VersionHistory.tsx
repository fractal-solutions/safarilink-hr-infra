import { useState, useEffect } from "react";
import { History, X, ChevronDown } from "lucide-react";
import { getSectionVersions, type SectionVersion } from "@/api";
import { cn } from "@/lib/utils";

interface VersionHistoryProps {
  sectionId: string;
  onClose: () => void;
}

export function VersionHistory({ sectionId, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<SectionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getSectionVersions(sectionId).then((data) => {
      setVersions(data);
      setLoading(false);
    });
  }, [sectionId]);

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || "";
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-sky-600" /> Version History
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              No previous versions found. Edits to this section will be tracked here.
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{v.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        by {v.editorName ?? "Unknown"} — {new Date(v.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", expandedId === v.id && "rotate-180")} />
                  </button>
                  {expandedId === v.id && (
                    <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700 pt-2">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-300 max-h-40 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: v.content }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
