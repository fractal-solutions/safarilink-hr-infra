import { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Circle,
  CheckCircle,
  BarChart3,
  Activity,
} from "lucide-react";
import type { PolicyDocument, User } from "@/types";
import * as api from "@/api";
import type { TrendPoint } from "@/api";
import { cn } from "@/lib/utils";

interface ReportsViewProps {
  documents: PolicyDocument[];
  tracking: Record<string, boolean>;
  filterDocument?: PolicyDocument | null;
}

type FilterTab = "all" | "non-compliant" | "in-progress" | "compliant" | "below-threshold";

interface UserDocStats {
  docId: string;
  docTitle: string;
  read: number;
  total: number;
  pct: number;
}

interface UserStat extends User {
  docStats: UserDocStats[];
  overallPct: number;
}

export function ReportsView({
  documents,
  tracking,
  filterDocument,
}: ReportsViewProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTracking, setAllTracking] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [threshold, setThreshold] = useState(50);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserStat | null>(null);
  const [userAudit, setUserAudit] = useState<any[]>([]);
  const [auditTab, setAuditTab] = useState<"sections" | "audit">("sections");
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [showTrend, setShowTrend] = useState(false);

  useEffect(() => {
    import("@/auth").then(({ getAllUsers }) => getAllUsers().then(setAllUsers));
    api.getAllTracking().then(setAllTracking);
    api.getTrend().then((data) => setTrend(data.trend));
  }, []);

  useEffect(() => {
    if (selectedUser) {
      api.getUserAudit(selectedUser.id).then(setUserAudit);
      setAuditTab("sections");
    }
  }, [selectedUser]);

  const docs = filterDocument
    ? documents.filter((d) => d.id === filterDocument.id)
    : documents;

  const staffUsers = allUsers.filter((u) => u.role !== "admin");

  const totalSections = docs.reduce((acc, doc) => acc + doc.sections.length, 0);

  const userStats: UserStat[] = useMemo(() => {
    return staffUsers.map((user) => {
      const docStats: UserDocStats[] = docs.map((doc) => {
        let read = 0;
        doc.sections.forEach((sec) => {
          if (allTracking[`${user.id}_${sec.id}`]) read++;
        });
        const pct = doc.sections.length > 0 ? Math.round((read / doc.sections.length) * 100) : 0;
        return { docId: doc.id, docTitle: doc.title, read, total: doc.sections.length, pct };
      });

      const totalRead = docStats.reduce((sum, ds) => sum + ds.read, 0);
      const overallPct = totalSections > 0 ? Math.round((totalRead / totalSections) * 100) : 0;

      return { ...user, docStats, overallPct };
    });
  }, [staffUsers, docs, allTracking, totalSections]);

  const sortedUsers = useMemo(() => {
    return [...userStats].sort((a, b) => a.overallPct - b.overallPct);
  }, [userStats]);

  const filteredUsers = useMemo(() => {
    switch (activeTab) {
      case "compliant":
        return sortedUsers.filter((u) => u.overallPct === 100);
      case "in-progress":
        return sortedUsers.filter((u) => u.overallPct > 0 && u.overallPct < 100);
      case "non-compliant":
        return sortedUsers.filter((u) => u.overallPct < 100);
      case "below-threshold":
        return sortedUsers.filter((u) => u.overallPct < threshold);
      default:
        return sortedUsers;
    }
  }, [sortedUsers, activeTab, threshold]);

  const fullyCompliant = userStats.filter((u) => u.overallPct === 100).length;
  const notStarted = userStats.filter((u) => u.overallPct === 0).length;
  const inProgressCount = userStats.length - fullyCompliant - notStarted;

  const overallRate = userStats.length > 0
    ? Math.round(userStats.reduce((sum, u) => sum + u.overallPct, 0) / userStats.length)
    : 0;

  const title = filterDocument
    ? `${filterDocument.title} — Report`
    : "Overall Compliance Analytics";

  const subtitle = filterDocument
    ? "Analytics for this manual across all staff (excluding admins)."
    : "Analytics across all policy manuals and staff (excluding admins).";

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All Staff", count: userStats.length },
    { key: "non-compliant", label: "Non-Compliant", count: userStats.length - fullyCompliant },
    { key: "in-progress", label: "In Progress", count: inProgressCount },
    { key: "compliant", label: "Compliant", count: fullyCompliant },
    { key: "below-threshold", label: `Below ${threshold}%`, count: userStats.filter((u) => u.overallPct < threshold).length },
  ];

  const getBarColor = (pct: number) => {
    if (pct === 100) return "bg-sf-gold";
    if (pct > 50) return "bg-sf-brown-light";
    if (pct > 0) return "bg-amber-500";
    return "bg-slate-300";
  };

  const getStatusBadge = (pct: number) => {
    if (pct === 100) return { text: "Compliant", className: "bg-sf-gold/15 text-sf-brown-dark" };
    if (pct > 0) return { text: "In Progress", className: "bg-amber-100 text-amber-700" };
    return { text: "Not Started", className: "bg-slate-100 text-slate-500" };
  };

  const exportCSV = () => {
    const headers = ["Name", "Username", "Email", ...docs.map((d) => d.title), "Overall %", "Status"];
    const rows = filteredUsers.map((u) => {
      const status = u.overallPct === 100 ? "Compliant" : u.overallPct === 0 ? "Not Started" : "In Progress";
      return [
        u.displayName,
        u.username,
        u.email || "",
        ...u.docStats.map((ds) => `${ds.read}/${ds.total} (${ds.pct}%)`),
        String(u.overallPct),
        status,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safarilink-${activeTab}-${filterDocument ? filterDocument.title.replace(/\s+/g, "-").toLowerCase() : "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }

    const filterLabel = activeTab === "all" ? "All Staff" : activeTab === "compliant" ? "Compliant Staff" : activeTab === "non-compliant" ? "Non-Compliant Staff" : activeTab === "in-progress" ? "In Progress Staff" : `Staff Below ${threshold}%`;

    const userCards = filteredUsers.map((u) => {
      const status = getStatusBadge(u.overallPct);
      const manualBars = u.docStats.map((ds) => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">
          <div style="min-width:200px;max-width:280px;font-size:0.75rem;color:#555" title="${ds.docTitle}">${ds.docTitle}</div>
          <div style="flex:1;height:8px;background:#F5EDE0;border-radius:4px;overflow:hidden">
            <div style="width:${ds.pct}%;height:100%;background:${ds.pct === 100 ? '#C8A951' : ds.pct > 50 ? '#7A5230' : ds.pct > 0 ? '#D4A017' : '#ddd'};border-radius:4px"></div>
          </div>
          <div style="min-width:45px;text-align:right;font-size:0.75rem;font-weight:600;color:#5C3A1E">${ds.pct}%</div>
          <div style="min-width:45px;text-align:right;font-size:0.7rem;color:#999">${ds.read}/${ds.total}</div>
        </div>
      `).join("");

      return `
        <div style="border:1px solid #F5EDE0;border-radius:8px;padding:14px;margin-bottom:12px;page-break-inside:avoid">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div>
              <div style="font-weight:700;font-size:0.9rem;color:#5C3A1E">${u.displayName}</div>
              <div style="font-size:0.7rem;color:#888">@${u.username}${u.email ? ` · ${u.email}` : ""}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:1.3rem;font-weight:700;color:${u.overallPct === 100 ? '#5C3A1E' : u.overallPct > 0 ? '#C8A951' : '#999'}">${u.overallPct}%</div>
              <div style="font-size:0.65rem;padding:2px 8px;border-radius:4px;background:${u.overallPct === 100 ? '#FDF8F0' : u.overallPct > 0 ? '#FFF8E1' : '#F5F5F5'};color:${u.overallPct === 100 ? '#5C3A1E' : u.overallPct > 0 ? '#B8860B' : '#999'};font-weight:600">${status.text}</div>
            </div>
          </div>
          <div style="border-top:1px solid #F5EDE0;padding-top:8px">
            ${manualBars}
          </div>
        </div>
      `;
    }).join("");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} — ${filterLabel}</title>
        <style>
          @page { margin: 18mm; }
          body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.4; margin: 0; padding: 20px; }
          h1 { font-size: 1.4rem; font-weight: 700; color: #5C3A1E; margin: 0 0 2px 0; }
          .subtitle { font-size: 0.8rem; color: #666; margin: 0 0 12px 0; }
          .filter-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; background: #FDF8F0; border: 1px solid #F5EDE0; color: #5C3A1E; font-weight: 600; font-size: 0.8rem; margin-bottom: 16px; }
          .stats { display: flex; gap: 12px; margin-bottom: 20px; }
          .stat-box { flex: 1; padding: 14px; background: #FDF8F0; border: 1px solid #F5EDE0; border-radius: 8px; }
          .stat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #888; font-weight: 600; }
          .stat-value { font-size: 1.5rem; font-weight: 700; color: #5C3A1E; }
          .section-title { font-size: 1rem; font-weight: 700; color: #5C3A1E; margin: 20px 0 12px 0; padding-bottom: 4px; border-bottom: 2px solid #C8A951; }
          .footer { margin-top: 24px; font-size: 0.7rem; color: #999; border-top: 1px solid #F5EDE0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="subtitle">${subtitle}</p>
        <div class="filter-badge">Filtered: ${filterLabel} (${filteredUsers.length} staff)</div>
        <div class="stats">
          <div class="stat-box"><div class="stat-label">Overall Completion</div><div class="stat-value">${overallRate}%</div></div>
          <div class="stat-box"><div class="stat-label">Compliant</div><div class="stat-value">${fullyCompliant}</div></div>
          <div class="stat-box"><div class="stat-label">In Progress</div><div class="stat-value">${inProgressCount}</div></div>
          <div class="stat-box"><div class="stat-label">Not Started</div><div class="stat-value">${notStarted}</div></div>
        </div>
        <div class="section-title">Staff Compliance Details — ${filterLabel}</div>
        ${userCards}
        <p class="footer">Generated on ${new Date().toLocaleDateString()} | Safarilink HR Compliance Portal — ${filterLabel}</p>
      </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold text-sf-brown flex items-center gap-2">
            <PieChart className="w-5 h-5 text-sf-gold" /> {title}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-sf-cream hover:bg-sf-cream-dark text-sf-brown rounded-lg border border-sf-cream-dark transition-colors"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-sf-brown hover:bg-sf-brown-dark text-white rounded-lg transition-colors shadow-xs"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-sf-cream to-sf-cream-dark p-4 rounded-xl border border-sf-cream-dark">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-sf-brown" />
            <span className="text-xs font-semibold text-sf-brown uppercase tracking-wider">Overall</span>
          </div>
          <p className="text-3xl font-bold text-sf-brown-dark">{overallRate}%</p>
          <div className="w-full bg-sf-cream-dark rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-sf-gold h-1.5 rounded-full transition-all" style={{ width: `${overallRate}%` }} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-sf-cream to-sf-cream-dark p-4 rounded-xl border border-sf-cream-dark">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-sf-gold" />
            <span className="text-xs font-semibold text-sf-brown uppercase tracking-wider">Compliant</span>
          </div>
          <p className="text-3xl font-bold text-sf-brown-dark">{fullyCompliant}</p>
          <p className="text-xs text-sf-brown-light mt-1">staff</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">In Progress</span>
          </div>
          <p className="text-3xl font-bold text-amber-900">{inProgressCount}</p>
          <p className="text-xs text-amber-600 mt-1">staff</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-4 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Not Started</span>
          </div>
          <p className="text-3xl font-bold text-red-900">{notStarted}</p>
          <p className="text-xs text-red-600 mt-1">staff</p>
        </div>
      </div>

      {!filterDocument && trend.length > 0 && (
        <div className="bg-white rounded-xl border border-sf-cream-dark shadow-xs overflow-hidden">
          <button
            onClick={() => setShowTrend(!showTrend)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-sf-cream/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sf-gold" />
              <h4 className="font-bold text-sf-brown text-sm">Completion Over Time</h4>
              <span className="text-[11px] text-slate-400">({trend.length} data points)</span>
            </div>
            {showTrend ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showTrend && (
            <div className="px-4 pb-4">
              <div className="flex items-end gap-1 h-32">
                {trend.map((tp, i) => {
                  const maxPct = Math.max(...trend.map((t) => t.completionPct), 1);
                  const height = (tp.completionPct / maxPct) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                          {tp.date}: {tp.completionPct}% (+{tp.readCount} read, -{tp.unreadCount} unread)
                        </div>
                      </div>
                      <div
                        className={cn(
                          "w-full rounded-t transition-all min-h-[2px]",
                          tp.completionPct >= 80 ? "bg-sf-gold" : tp.completionPct >= 40 ? "bg-sf-brown-light" : "bg-amber-400"
                        )}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                <span>{trend[0]?.date}</span>
                <span>{trend[trend.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-sf-cream-dark shadow-xs overflow-hidden">
        <div className="p-4 border-b border-sf-cream-dark">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-sf-gold" />
            <h4 className="font-bold text-sf-brown text-sm">Filter by Compliance</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                  activeTab === tab.key
                    ? "bg-sf-brown text-white border-sf-brown"
                    : "bg-sf-cream text-slate-600 border-sf-cream-dark hover:bg-sf-cream-dark"
                )}
              >
                {tab.label}
                <span className={cn(
                  "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  activeTab === tab.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          {activeTab === "below-threshold" && (
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs text-slate-500 font-medium">Threshold:</label>
              <input
                type="range"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-40 accent-sf-brown"
              />
              <span className="text-sm font-bold text-sf-brown tabular-nums">{threshold}%</span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No staff match this filter.
            </div>
          )}
          {filteredUsers.map((u) => {
            const status = getStatusBadge(u.overallPct);
            return (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="border border-sf-cream-dark rounded-xl overflow-hidden bg-white hover:border-sf-gold/30 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-full bg-sf-cream flex items-center justify-center font-bold text-sm text-sf-brown shrink-0">
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">{u.displayName}</span>
                      <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-md", status.className)}>
                        {status.text}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      @{u.username}{u.email && <span className="ml-1.5 text-sf-gold-dark">{u.email}</span>}
                    </div>
                    <div className="w-full bg-sf-cream-dark rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={cn("h-1.5 rounded-full transition-all", getBarColor(u.overallPct))}
                        style={{ width: `${u.overallPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn(
                      "text-xl font-bold tabular-nums",
                      u.overallPct === 100 ? "text-sf-brown-dark" : u.overallPct > 0 ? "text-sf-gold-dark" : "text-slate-400"
                    )}>
                      {u.overallPct}%
                    </div>
                    <div className="text-[10px] text-slate-400">overall</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-sf-cream-dark dark:border-slate-700">
            <div className="flex items-center gap-4 p-5 border-b border-sf-cream-dark dark:border-slate-700">
              <div className="w-12 h-12 rounded-full bg-sf-cream dark:bg-slate-700 flex items-center justify-center font-bold text-lg text-sf-brown shrink-0">
                {selectedUser.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100">{selectedUser.displayName}</h3>
                <p className="text-xs text-slate-400">
                  @{selectedUser.username}{selectedUser.email && <span className="ml-1.5 text-sf-gold-dark">{selectedUser.email}</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className={cn(
                  "text-2xl font-bold tabular-nums",
                  selectedUser.overallPct === 100 ? "text-sf-brown-dark" : selectedUser.overallPct > 0 ? "text-sf-gold-dark" : "text-slate-400"
                )}>
                  {selectedUser.overallPct}%
                </div>
                <div className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md inline-block",
                  getStatusBadge(selectedUser.overallPct).className
                )}>
                  {getStatusBadge(selectedUser.overallPct).text}
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-sf-cream dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex border-b border-sf-cream-dark dark:border-slate-700 px-5 pt-3 gap-1">
                <button
                  onClick={() => setAuditTab("sections")}
                  className={cn(
                    "px-3 py-2 text-xs font-medium rounded-t-lg transition-colors",
                    auditTab === "sections"
                      ? "bg-sf-cream dark:bg-slate-800 text-sf-brown dark:text-slate-100 border border-sf-cream-dark dark:border-slate-700 border-b-transparent -mb-px"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  Section Progress
                </button>
                <button
                  onClick={() => setAuditTab("audit")}
                  className={cn(
                    "px-3 py-2 text-xs font-medium rounded-t-lg transition-colors",
                    auditTab === "audit"
                      ? "bg-sf-cream dark:bg-slate-800 text-sf-brown dark:text-slate-100 border border-sf-cream-dark dark:border-slate-700 border-b-transparent -mb-px"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  Activity Log ({userAudit.length})
                </button>
              </div>

              <div className="p-5 space-y-4">
              {auditTab === "sections" ? (
              <>
              {selectedUser.docStats.map((ds) => {
                const sections = docs.find((d) => d.id === ds.docId)?.sections || [];
                return (
                  <div key={ds.docId} className="border border-sf-cream-dark dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-sf-cream dark:bg-slate-800">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-sf-brown dark:text-slate-100 truncate">{ds.docTitle}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{ds.read} of {ds.total} sections read</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24 bg-sf-cream-dark dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={cn("h-2 rounded-full transition-all", getBarColor(ds.pct))}
                            style={{ width: `${ds.pct}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-sm font-bold tabular-nums w-10 text-right",
                          ds.pct === 100 ? "text-sf-brown-dark" : ds.pct > 0 ? "text-sf-gold-dark" : "text-slate-400"
                        )}>
                          {ds.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-sf-cream-dark dark:divide-slate-700">
                      {sections.map((sec) => {
                        const isRead = !!allTracking[`${selectedUser.id}_${sec.id}`];
                        return (
                          <div key={sec.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="shrink-0">
                              {isRead ? (
                                <CheckCircle className="w-4 h-4 text-sf-gold" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                              )}
                            </div>
                            <span className={cn(
                              "text-xs flex-1 min-w-0 truncate",
                              isRead ? "text-slate-700 dark:text-slate-300 font-medium" : "text-slate-400 dark:text-slate-500"
                            )}>
                              {sec.title}
                            </span>
                            <span className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0",
                              isRead ? "bg-sf-gold/15 text-sf-brown-dark" : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                            )}>
                              {isRead ? "Read" : "Unread"}
                            </span>
                          </div>
                        );
                      })}
                       {sections.length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-400 text-center">No sections in this manual</div>
                      )}
                    </div>
                  </div>
                );
              })}
              </>
              ) : (
              <div className="space-y-2">
                {userAudit.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No activity recorded yet.</p>
                ) : (
                  userAudit.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 bg-sf-cream/50 dark:bg-slate-800/50 rounded-lg border border-sf-cream-dark dark:border-slate-700">
                      <div className="w-2 h-2 rounded-full bg-sf-gold mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{entry.action.replace(/_/g, " ")}</span>
                          {entry.details && (
                            <span className="text-[11px] text-slate-400 truncate">— {entry.details}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
