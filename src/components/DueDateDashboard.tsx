import { useState, useEffect } from "react";
import { Calendar, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { getDueDates, type DueDateEntry } from "@/api";
import { cn } from "@/lib/utils";

export function DueDateDashboard() {
  const [entries, setEntries] = useState<DueDateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDueDates().then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">Loading due dates...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No policy manuals have due dates set.</p>
        <p className="text-xs mt-1">Set due dates when creating or editing documents.</p>
      </div>
    );
  }

  const overdue = entries.filter((e) => e.isOverdue);
  const upcoming = entries.filter((e) => !e.isOverdue && e.daysLeft <= 7);
  const onTrack = entries.filter((e) => !e.isOverdue && e.daysLeft > 7);

  const renderGroup = (title: string, items: DueDateEntry[], color: string, icon: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className={cn("text-sm font-bold uppercase tracking-wider", color)}>
            {title} ({items.length})
          </h4>
        </div>
        <div className="space-y-2">
          {items.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{entry.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {entry.readSections}/{entry.totalSections} sections read ({entry.completionPct}%)
                </p>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      entry.completionPct === 100 ? "bg-emerald-500" : entry.completionPct > 50 ? "bg-sky-500" : "bg-amber-500"
                    )}
                    style={{ width: `${entry.completionPct}%` }}
                  />
                </div>
              </div>
              <div className="ml-4 shrink-0 text-right">
                <p className={cn("text-xs font-bold", entry.isOverdue ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}>
                  {entry.isOverdue
                    ? `${Math.abs(entry.daysLeft)} day${Math.abs(entry.daysLeft) !== 1 ? "s" : ""} overdue`
                    : entry.daysLeft === 0
                      ? "Due today"
                      : `${entry.daysLeft} day${entry.daysLeft !== 1 ? "s" : ""} left`}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Due {new Date(entry.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderGroup("Overdue", overdue, "text-red-600 dark:text-red-400", <AlertTriangle className="w-4 h-4 text-red-500" />)}
      {renderGroup("Due Soon (7 days)", upcoming, "text-amber-600 dark:text-amber-400", <Clock className="w-4 h-4 text-amber-500" />)}
      {renderGroup("On Track", onTrack, "text-emerald-600 dark:text-emerald-400", <CheckCircle2 className="w-4 h-4 text-emerald-500" />)}
    </div>
  );
}
