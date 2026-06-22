import { PlaneTakeoff, Settings, LogOut } from "lucide-react";
import type { User } from "@/types";

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export function Header({ user, onLogout, onOpenSettings }: HeaderProps) {
  const isAdmin = user.role === "admin";

  return (
    <header className="bg-sky-900 text-white shadow-md px-6 py-4 flex justify-between items-center shrink-0">
      <div className="flex items-center space-x-3">
        <PlaneTakeoff className="w-8 h-8 text-sky-400" />
        <div>
          <h1 className="text-xl font-bold tracking-wide">Safarilink</h1>
          <p className="text-xs text-sky-200">HR Compliance & Policy Portal</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {isAdmin && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-sky-300 hover:text-white hover:bg-sky-800 transition-colors"
            title="User Management"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        )}

        <div className="flex items-center space-x-2 border-l border-sky-800 pl-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              isAdmin
                ? "bg-amber-600 text-amber-100"
                : "bg-sky-700 text-sky-200"
            }`}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-xs">
            <p className="font-semibold">{user.displayName}</p>
            <p className="text-sky-300 capitalize">
              {isAdmin ? "Administrator" : "Staff"}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-sky-300 hover:text-white hover:bg-sky-800 transition-colors border-l border-sky-800 pl-3"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
