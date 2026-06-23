import { useState } from "react";
import { PlaneTakeoff, Settings, LogOut, Moon, Sun, Search, Menu, X } from "lucide-react";
import type { User } from "@/types";

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onOpenSettings: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onSearch: (query: string) => void;
}

export function Header({ user, onLogout, onOpenSettings, isDark, onToggleDark, onSearch }: HeaderProps) {
  const isAdmin = user.role === "admin";
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <header className="bg-sky-900 dark:bg-slate-900 text-white shadow-md px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0 relative z-40">
      <div className="flex items-center space-x-3">
        <PlaneTakeoff className="w-7 h-7 sm:w-8 sm:h-8 text-sky-400" />
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-wide">Safarilink</h1>
          <p className="text-[10px] sm:text-xs text-sky-200">HR Compliance & Policy Portal</p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3 relative">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search policies..."
            className="pl-9 pr-3 py-2 bg-sky-800/50 border border-sky-700 rounded-lg text-sm text-white placeholder-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 w-48 lg:w-64 transition-all"
          />
        </div>

        <button
          onClick={onToggleDark}
          className="p-2 rounded-lg text-sky-300 hover:text-white hover:bg-sky-800 transition-colors"
          title={isDark ? "Light Mode" : "Dark Mode"}
        >
          {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {isAdmin && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-sky-300 hover:text-white hover:bg-sky-800 transition-colors"
            title="User Management"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        )}

        <div className="flex items-center space-x-2 border-l border-sky-800 pl-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              isAdmin ? "bg-amber-600 text-amber-100" : "bg-sky-700 text-sky-200"
            }`}
          >
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-xs">
            <p className="font-semibold">{user.displayName}</p>
            <p className="text-sky-300 capitalize">{isAdmin ? "Administrator" : "Staff"}</p>
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

      <button
        className="md:hidden p-2 rounded-lg text-sky-300 hover:text-white hover:bg-sky-800 transition-colors"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {showMobileMenu && (
        <div className="absolute top-full left-0 right-0 bg-sky-900 dark:bg-slate-900 border-t border-sky-800 dark:border-slate-700 p-4 space-y-3 md:hidden shadow-xl z-50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search policies..."
              className="w-full pl-9 pr-3 py-2 bg-sky-800/50 border border-sky-700 rounded-lg text-sm text-white placeholder-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-sky-200">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isAdmin ? "bg-amber-600 text-amber-100" : "bg-sky-700 text-sky-200"}`}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white">{user.displayName}</p>
              <p className="text-sky-300 text-xs capitalize">{isAdmin ? "Administrator" : "Staff"}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onToggleDark}
              className="flex items-center gap-2 px-3 py-2 bg-sky-800/50 rounded-lg text-sm text-sky-200 hover:text-white hover:bg-sky-700 transition-colors flex-1 justify-center"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDark ? "Light" : "Dark"}
            </button>
            {isAdmin && (
              <button
                onClick={() => { onOpenSettings(); setShowMobileMenu(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-sky-800/50 rounded-lg text-sm text-sky-200 hover:text-white hover:bg-sky-700 transition-colors flex-1 justify-center"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
            )}
          </div>

          <button
            onClick={() => { onLogout(); setShowMobileMenu(false); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-900/30 rounded-lg text-sm text-red-300 hover:bg-red-900/50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
