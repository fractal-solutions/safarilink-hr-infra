import { useState, useEffect } from "react";
import { Files, Users, Activity } from "lucide-react";
import type { PolicyDocument, User } from "@/types";

interface AdminDashboardProps {
  documents: PolicyDocument[];
  tracking: Record<string, boolean>;
}

export function AdminDashboard({ documents, tracking }: AdminDashboardProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    import("@/auth").then(({ getAllUsers }) => setAllUsers(getAllUsers()));
  }, []);

  const totalSections = documents.reduce(
    (acc, doc) => acc + doc.sections.length,
    0
  );
  let totalPossible = totalSections * allUsers.length;
  let positive = 0;

  allUsers.forEach((user) => {
    documents.forEach((doc) => {
      doc.sections.forEach((sec) => {
        if (tracking[`${user.id}_${sec.id}`]) positive++;
      });
    });
  });

  const rate =
    totalPossible > 0 ? Math.round((positive / totalPossible) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
        <div className="p-3 bg-sky-50 rounded-lg text-sky-600">
          <Files className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Total Policies
          </p>
          <h4 className="text-2xl font-bold text-slate-800">
            {documents.length}
          </h4>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
        <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Registered Users
          </p>
          <h4 className="text-2xl font-bold text-slate-800">
            {allUsers.length}
          </h4>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4">
        <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Overall Completion
          </p>
          <h4 className="text-2xl font-bold text-slate-800">{rate}%</h4>
        </div>
      </div>
    </div>
  );
}
