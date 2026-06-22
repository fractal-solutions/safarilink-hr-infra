import { useState, useEffect } from "react";
import {
  PieChart,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { PolicyDocument, User } from "@/types";

interface ReportsViewProps {
  documents: PolicyDocument[];
  tracking: Record<string, boolean>;
  filterDocument?: PolicyDocument | null;
}

export function ReportsView({
  documents,
  tracking,
  filterDocument,
}: ReportsViewProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    import("@/auth").then(({ getAllUsers }) => setAllUsers(getAllUsers()));
  }, []);

  const docs = filterDocument
    ? documents.filter((d) => d.id === filterDocument.id)
    : documents;

  const totalSections = docs.reduce(
    (acc, doc) => acc + doc.sections.length,
    0
  );
  const totalCells = totalSections * allUsers.length;
  let completedCells = 0;

  docs.forEach((doc) => {
    allUsers.forEach((user) => {
      doc.sections.forEach((sec) => {
        if (tracking[`${user.id}_${sec.id}`]) completedCells++;
      });
    });
  });

  const overallRate =
    totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;

  const userStats = allUsers.map((user) => {
    let done = 0;
    docs.forEach((doc) => {
      doc.sections.forEach((sec) => {
        if (tracking[`${user.id}_${sec.id}`]) done++;
      });
    });
    const pct =
      totalSections > 0 ? Math.round((done / totalSections) * 100) : 0;
    return { ...user, done, total: totalSections, pct };
  });

  const docStats = docs.map((doc) => {
    let done = 0;
    allUsers.forEach((user) => {
      doc.sections.forEach((sec) => {
        if (tracking[`${user.id}_${sec.id}`]) done++;
      });
    });
    const total = doc.sections.length * allUsers.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { ...doc, done, total, pct };
  });

  const fullyCompliant = userStats.filter((s) => s.pct === 100).length;
  const notStarted = userStats.filter((s) => s.pct === 0).length;
  const inProgress = userStats.length - fullyCompliant - notStarted;

  const title = filterDocument
    ? `${filterDocument.title} — Analytics`
    : "Overall Compliance Analytics";

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <PieChart className="w-5 h-5 text-sky-600" /> {title}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 p-4 rounded-xl border border-sky-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
              {filterDocument ? "Completion" : "Overall"}
            </span>
          </div>
          <p className="text-3xl font-bold text-sky-900">{overallRate}%</p>
          <div className="w-full bg-sky-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-sky-600 h-1.5 rounded-full transition-all"
              style={{ width: `${overallRate}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-xl border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Compliant
            </span>
          </div>
          <p className="text-3xl font-bold text-emerald-900">
            {fullyCompliant}
          </p>
          <p className="text-xs text-emerald-600 mt-1">users</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              In Progress
            </span>
          </div>
          <p className="text-3xl font-bold text-amber-900">{inProgress}</p>
          <p className="text-xs text-amber-600 mt-1">users</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-4 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">
              Not Started
            </span>
          </div>
          <p className="text-3xl font-bold text-red-900">{notStarted}</p>
          <p className="text-xs text-red-600 mt-1">users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              User Completion Breakdown
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {userStats
              .sort((a, b) => a.pct - b.pct)
              .map((s) => (
                <div key={s.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {s.displayName}
                        {s.role === "admin" && (
                          <span className="ml-1.5 text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                            ADMIN
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-mono text-slate-500 tabular-nums ml-2">
                        {s.done}/{s.total}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          s.pct === 100
                            ? "bg-emerald-500"
                            : s.pct > 50
                              ? "bg-sky-500"
                              : s.pct > 0
                                ? "bg-amber-500"
                                : "bg-slate-300"
                        }`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      @{s.username}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-md ${
                      s.pct === 100
                        ? "bg-emerald-100 text-emerald-700"
                        : s.pct > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.pct}%
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              {filterDocument
                ? "Section Completion"
                : "Document Compliance Breakdown"}
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {docStats.map((doc) => (
              <div key={doc.id} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {filterDocument ? "Overall" : doc.title}
                  </span>
                  <span
                    className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-md ${
                      doc.pct === 100
                        ? "bg-emerald-100 text-emerald-700"
                        : doc.pct > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {doc.pct}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      doc.pct === 100
                        ? "bg-emerald-500"
                        : doc.pct > 50
                          ? "bg-sky-500"
                          : doc.pct > 0
                            ? "bg-amber-500"
                            : "bg-slate-300"
                    }`}
                    style={{ width: `${doc.pct}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {doc.sections.map((sec) => {
                    const sectionReadCount = allUsers.filter(
                      (user) => tracking[`${user.id}_${sec.id}`]
                    ).length;
                    const sectionPct =
                      allUsers.length > 0
                        ? Math.round(
                            (sectionReadCount / allUsers.length) * 100
                          )
                        : 0;
                    return (
                      <div
                        key={sec.id}
                        title={`${sec.title}: ${sectionReadCount}/${allUsers.length} users`}
                      >
                        <div
                          className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center border ${
                            sectionPct === 100
                              ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                              : sectionPct > 0
                                ? "bg-amber-100 border-amber-300 text-amber-700"
                                : "bg-red-50 border-red-200 text-red-400"
                          }`}
                        >
                          {sectionPct === 100
                            ? "\u2713"
                            : sectionPct > 0
                              ? sectionReadCount
                              : "\u2717"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!filterDocument && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    {doc.sections.length} section
                    {doc.sections.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-600" />
          <h4 className="font-bold text-slate-900 text-sm">
            {filterDocument
              ? "Per-User Progress for This Manual"
              : "Full Compliance Matrix"}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-semibold text-xs tracking-wider border-b border-slate-200 uppercase">
                <th className="p-4">User</th>
                {docs.map((doc) => (
                  <th key={doc.id} className="p-4">
                    {filterDocument ? "Sections Read" : doc.title}
                  </th>
                ))}
                <th className="p-4">Total</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
              {allUsers.map((user) => {
                let userTotal = 0;
                const docResults = docs.map((doc) => {
                  let readCount = 0;
                  doc.sections.forEach((sec) => {
                    if (tracking[`${user.id}_${sec.id}`]) readCount++;
                  });
                  const pct =
                    doc.sections.length > 0
                      ? Math.round((readCount / doc.sections.length) * 100)
                      : 0;
                  userTotal += pct;
                  return { doc, readCount, total: doc.sections.length, pct };
                });
                const avgPct =
                  docs.length > 0
                    ? Math.round(userTotal / docs.length)
                    : 0;

                return (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">
                        {user.displayName}
                        {user.role === "admin" && (
                          <span className="ml-1.5 text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        @{user.username}
                      </div>
                    </td>
                    {docResults.map(({ doc, readCount, total, pct }) => (
                      <td key={doc.id} className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                pct === 100
                                  ? "bg-emerald-500"
                                  : pct > 0
                                    ? "bg-amber-500"
                                    : "bg-red-300"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {readCount}/{total}
                          </span>
                        </div>
                      </td>
                    ))}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                          avgPct === 100
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : avgPct > 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {avgPct}%
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
