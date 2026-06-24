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
} from "lucide-react";
import type { PolicyDocument, User } from "@/types";
import * as api from "@/api";
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

  useEffect(() => {
    import("@/auth").then(({ getAllUsers }) => getAllUsers().then(setAllUsers));
    api.getAllTracking().then(setAllTracking);
  }, []);

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

  const overallRate = totalSections > 0 && staffUsers.length > 0
    ? Math.round(userStats.reduce((sum, u) => sum + u.overallPct, 0) / staffUsers.length)
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

    const manualHeaders = docs.map((d) => `<th style="padding:8px;border-bottom:2px solid #F5EDE0;text-align:center;font-size:0.65rem;max-width:100px;word-break:break-word">${d.title.length > 20 ? d.title.slice(0, 18) + "..." : d.title}</th>`).join("");

    const userRows = filteredUsers.map((u) => {
      const statusColor = u.overallPct === 100 ? "#5C3A1E" : u.overallPct > 0 ? "#C8A951" : "#999";
      const statusText = u.overallPct === 100 ? "Compliant" : u.overallPct === 0 ? "Not Started" : "In Progress";
      const manualCells = u.docStats.map((ds) => {
        const color = ds.pct === 100 ? "#5C3A1E" : ds.pct > 0 ? "#C8A951" : "#ccc";
        return `<td style="padding:6px 8px;border-bottom:1px solid #F5EDE0;text-align:center;font-size:0.75rem"><span style="color:${color};font-weight:600">${ds.pct}%</span><br/><span style="font-size:0.65rem;color:#999">${ds.read}/${ds.total}</span></td>`;
      }).join("");
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #F5EDE0;font-weight:600;font-size:0.8rem">${u.displayName}</td>
        <td style="padding:8px;border-bottom:1px solid #F5EDE0;color:#666;font-size:0.75rem">@${u.username}</td>
        <td style="padding:8px;border-bottom:1px solid #F5EDE0;color:#666;font-size:0.75rem">${u.email || "—"}</td>
        ${manualCells}
        <td style="padding:8px;border-bottom:1px solid #F5EDE0;text-align:center;font-weight:700;font-size:0.8rem;color:${statusColor}">${u.overallPct}%</td>
        <td style="padding:8px;border-bottom:1px solid #F5EDE0;text-align:center;font-size:0.7rem"><span style="padding:2px 8px;border-radius:4px;background:${u.overallPct === 100 ? "#FDF8F0" : u.overallPct > 0 ? "#FFF8E1" : "#F5F5F5"};color:${statusColor};font-weight:600">${statusText}</span></td>
      </tr>`;
    }).join("");

    const filterLabel = activeTab === "all" ? "All Staff" : activeTab === "compliant" ? "Compliant Staff" : activeTab === "non-compliant" ? "Non-Compliant Staff" : activeTab === "in-progress" ? "In Progress Staff" : `Staff Below ${threshold}%`;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} — ${filterLabel}</title>
        <style>
          @page { margin: 15mm; landscape; }
          body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.4; margin: 0; padding: 16px; font-size: 0.8rem; }
          h1 { font-size: 1.3rem; font-weight: 700; color: #5C3A1E; margin: 0 0 2px 0; }
          .subtitle { font-size: 0.8rem; color: #666; margin: 0 0 16px 0; }
          .filter-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; background: #FDF8F0; border: 1px solid #F5EDE0; color: #5C3A1E; font-weight: 600; font-size: 0.75rem; margin-bottom: 16px; }
          .stats { display: flex; gap: 12px; margin-bottom: 20px; }
          .stat-box { flex: 1; padding: 12px; background: #FDF8F0; border: 1px solid #F5EDE0; border-radius: 8px; }
          .stat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #888; font-weight: 600; }
          .stat-value { font-size: 1.5rem; font-weight: 700; color: #5C3A1E; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #FDF8F0; color: #5C3A1E; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px; text-align: left; border-bottom: 2px solid #F5EDE0; }
          .footer { margin-top: 24px; font-size: 0.7rem; color: #999; border-top: 1px solid #F5EDE0; padding-top: 8px; }
          .section-title { font-size: 0.9rem; font-weight: 700; color: #5C3A1E; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 2px solid #C8A951; }
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
        <div class="section-title">Staff Compliance Details (${filterLabel})</div>
        <table>
          <thead>
            <tr>
              <th style="min-width:100px">Name</th>
              <th>Username</th>
              <th>Email</th>
              ${manualHeaders}
              <th style="text-align:center">Overall</th>
              <th style="text-align:center">Status</th>
            </tr>
          </thead>
          <tbody>${userRows}</tbody>
        </table>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sf-cream text-sf-brown-light font-semibold text-xs tracking-wider border-b border-sf-cream-dark uppercase">
                <th className="p-4 sticky left-0 bg-sf-cream z-10">Staff Member</th>
                {!filterDocument && docs.map((doc) => (
                  <th key={doc.id} className="p-4 text-center min-w-[120px]">
                    <div className="truncate max-w-[120px]" title={doc.title}>{doc.title}</div>
                  </th>
                ))}
                <th className="p-4 text-center">Overall</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700 divide-y divide-sf-cream-dark">
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={docs.length + 3} className="p-8 text-center text-slate-400 text-sm">
                    No staff match this filter.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => {
                const statusText = u.overallPct === 100 ? "Compliant" : u.overallPct === 0 ? "Not Started" : "In Progress";
                return (
                  <tr key={u.id} className="hover:bg-sf-cream/80 transition-colors">
                    <td className="p-4 sticky left-0 bg-white z-10">
                      <div className="font-semibold text-slate-900">{u.displayName}</div>
                      <div className="text-xs text-slate-400">
                        @{u.username}
                        {u.email && <span className="ml-1.5 text-sf-gold-dark">{u.email}</span>}
                      </div>
                    </td>
                    {!filterDocument && u.docStats.map((ds) => (
                      <td key={ds.docId} className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-16 bg-sf-cream-dark rounded-full h-1.5 overflow-hidden">
                            <div
                              className={cn("h-1.5 rounded-full transition-all", ds.pct === 100 ? "bg-sf-gold" : ds.pct > 0 ? "bg-sf-brown-light" : "bg-red-300")}
                              style={{ width: `${ds.pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 tabular-nums">{ds.read}/{ds.total}</span>
                        </div>
                      </td>
                    ))}
                    <td className="p-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-lg border inline-block",
                        u.overallPct === 100 ? "bg-sf-gold/10 text-sf-brown-dark border-sf-gold/30" :
                        u.overallPct > 0 ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      )}>
                        {u.overallPct}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 text-[11px] font-semibold rounded-md inline-block",
                        u.overallPct === 100 ? "bg-sf-gold/15 text-sf-brown-dark" :
                        u.overallPct > 0 ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
