import { useState, useEffect } from "react";
import { Files, Users, Activity } from "lucide-react";
import * as api from "@/api";

interface AdminDashboardProps {
  documents: { id: string; sections: { id: string }[] }[];
}

export function AdminDashboard({ documents }: AdminDashboardProps) {
  const [stats, setStats] = useState<{ totalPolicies: number; totalUsers: number; overallCompletion: number } | null>(null);

  useEffect(() => {
    api.getStats().then(setStats);
  }, []);

  const totalSections = documents.reduce((acc, doc) => acc + doc.sections.length, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-4">
        <div className="p-3 bg-sky-50 dark:bg-sky-900/30 rounded-lg text-sky-600">
          <Files className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Total Policies</p>
          <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.totalPolicies ?? documents.length}</h4>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-4">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Registered Users</p>
          <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.totalUsers ?? 0}</h4>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Overall Completion</p>
          <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats?.overallCompletion ?? 0}%</h4>
        </div>
      </div>
    </div>
  );
}
