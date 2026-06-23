import { useState, useEffect } from "react";
import { Clock, User, FileText, ChevronDown } from "lucide-react";
import type { AuditEntry } from "@/types";
import * as api from "@/api";

interface AuditLogProps {
  documentId: string;
}

export function AuditLog({ documentId }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    api.getAudit(documentId).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, [documentId, expanded]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Audit Trail ({entries.length} entries)
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-sm">Loading audit trail...</div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">No audit entries yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
              {entries.map((entry) => (
                <div key={entry.id} className="p-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0 mt-0.5">
                    <FileText className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{entry.action}</span>
                      {entry.user_name && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <User className="w-3 h-3" /> {entry.user_name}
                        </span>
                      )}
                    </div>
                    {entry.details && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{entry.details}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(entry.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
