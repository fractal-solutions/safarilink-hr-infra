import { useState, useEffect } from "react";
import { History, X, ChevronDown, RotateCcw, GitCompare, Check } from "lucide-react";
import { getSectionVersions, restoreSectionVersion, type SectionVersion } from "@/api";
import { cn } from "@/lib/utils";

interface VersionHistoryProps {
  sectionId: string;
  onClose: () => void;
  onRestored?: () => void;
}

export function VersionHistory({ sectionId, onClose, onRestored }: VersionHistoryProps) {
  const [versions, setVersions] = useState<SectionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    getSectionVersions(sectionId).then((data) => {
      setVersions(data);
      setLoading(false);
    });
  }, [sectionId]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleRestore = async (version: SectionVersion) => {
    setRestoring(version.id);
    const ok = await restoreSectionVersion(sectionId, version.id);
    setRestoring(null);
    if (ok) {
      onRestored?.();
      onClose();
    }
  };

  const compareVersions = compareIds.length === 2
    ? versions.filter((v) => compareIds.includes(v.id))
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-sf-cream-dark dark:border-slate-700">
        <div className="flex justify-between items-center p-5 border-b border-sf-cream-dark dark:border-slate-700">
          <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-sf-gold" /> Version History
          </h3>
          <div className="flex items-center gap-2">
            {versions.length >= 2 && (
              <button
                onClick={() => { setCompareMode(!compareMode); setCompareIds([]); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                  compareMode
                    ? "bg-sf-brown text-white border-sf-brown"
                    : "bg-sf-cream text-slate-600 border-sf-cream-dark hover:bg-sf-cream-dark"
                )}
              >
                <GitCompare className="w-3.5 h-3.5" /> Compare
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {compareMode && compareIds.length < 2 && (
          <div className="px-5 py-2 bg-sf-cream dark:bg-slate-800 border-b border-sf-cream-dark dark:border-slate-700 text-xs text-slate-500">
            Select {2 - compareIds.length} more version{compareIds.length === 0 ? "s" : ""} to compare
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              No previous versions found. Edits to this section will be tracked here.
            </div>
          ) : compareMode && compareVersions.length === 2 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {compareVersions.map((v, i) => (
                  <div key={v.id} className="border border-sf-cream-dark dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="p-3 bg-sf-cream dark:bg-slate-800 border-b border-sf-cream-dark dark:border-slate-700">
                      <p className="text-xs font-bold text-sf-brown dark:text-slate-100">
                        {i === 0 ? "Older" : "Newer"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {v.editorName ?? "Unknown"} — {new Date(v.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 text-xs text-slate-600 dark:text-slate-300 max-h-60 overflow-y-auto prose prose-xs dark:prose-invert">
                      <div dangerouslySetInnerHTML={{ __html: v.content }} />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setCompareMode(false); setCompareIds([]); }}
                className="text-xs text-sf-gold hover:text-sf-gold-dark font-medium"
              >
                Exit compare
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((v, idx) => (
                <div
                  key={v.id}
                  className={cn(
                    "border rounded-lg overflow-hidden transition-colors",
                    compareIds.includes(v.id)
                      ? "border-sf-gold bg-sf-gold/5"
                      : "border-sf-cream-dark dark:border-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2 p-3">
                    {compareMode && (
                      <button
                        onClick={() => toggleCompare(v.id)}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          compareIds.includes(v.id)
                            ? "bg-sf-gold border-sf-gold text-white"
                            : "border-slate-300 dark:border-slate-600 hover:border-sf-gold"
                        )}
                      >
                        {compareIds.includes(v.id) && <Check className="w-3 h-3" />}
                      </button>
                    )}
                    <button
                      onClick={() => !compareMode && setExpandedId(expandedId === v.id ? null : v.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{v.title}</p>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sf-gold/15 text-sf-brown-dark">LATEST</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        by {v.editorName ?? "Unknown"} — {new Date(v.createdAt).toLocaleString()}
                      </p>
                    </button>
                    {!compareMode && idx > 0 && (
                      <button
                        onClick={() => handleRestore(v)}
                        disabled={restoring === v.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-sf-brown hover:bg-sf-cream dark:hover:bg-slate-800 rounded-lg border border-sf-cream-dark dark:border-slate-700 transition-colors shrink-0 disabled:opacity-50"
                        title="Restore this version"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {restoring === v.id ? "Restoring..." : "Restore"}
                      </button>
                    )}
                    {!compareMode && (
                      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform shrink-0", expandedId === v.id && "rotate-180")} />
                    )}
                  </div>
                  {!compareMode && expandedId === v.id && (
                    <div className="px-3 pb-3 border-t border-sf-cream-dark dark:border-slate-700 pt-2">
                      <div className="bg-sf-cream dark:bg-slate-800 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-300 max-h-40 overflow-y-auto">
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
