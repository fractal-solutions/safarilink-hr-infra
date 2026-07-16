import { useState } from "react";
import { Settings, LogOut, Moon, Sun, Search, Menu, X, LayoutDashboard, BookOpen, User } from "lucide-react";
import type { User as UserType } from "@/types";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onOpenSettings: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onSearch: (query: string) => void;
  activeView: "bulletin" | "manuals";
  onViewChange: (view: "bulletin" | "manuals") => void;
}

export function Header({ user, onLogout, onOpenSettings, isDark, onToggleDark, onSearch, activeView, onViewChange }: HeaderProps) {
  const isAdmin = user.role === "admin";
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <header className="bg-sf-brown dark:bg-slate-900 text-white shadow-lg px-4 sm:px-6 py-3 sm:py-3.5 flex justify-between items-center shrink-0 relative z-40">
      {/* Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden flex items-center justify-center bg-sf-brown border border-sf-gold/20 shrink-0 shadow-sm">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <rect width="200" height="200" rx="32" fill="#5C3A1E"/>
            <path d="M100 95 C90 85, 65 70, 30 60 C40 65, 55 72, 65 80 C50 75, 35 68, 18 62 C30 70, 50 80, 68 88 C55 84, 40 78, 25 74 C40 82, 58 90, 72 96 C62 93, 48 88, 35 84 C48 90, 62 96, 75 102 C68 100, 58 96, 50 92 C60 97, 72 102, 82 106 C78 105, 70 102, 64 99 C72 103, 82 108, 90 112 L95 108 Z" fill="#C8A951"/>
            <path d="M100 95 C110 85, 135 70, 170 60 C160 65, 145 72, 135 80 C150 75, 165 68, 182 62 C170 70, 150 80, 132 88 C145 84, 160 78, 175 74 C160 82, 142 90, 128 96 C138 93, 152 88, 165 84 C152 90, 138 96, 125 102 C132 100, 142 96, 150 92 C140 97, 128 102, 118 106 C122 105, 130 102, 136 99 C128 103, 118 108, 110 112 L105 108 Z" fill="#C8A951"/>
            <ellipse cx="100" cy="110" rx="12" ry="22" fill="#C8A951"/>
            <circle cx="100" cy="85" r="10" fill="#C8A951"/>
            <path d="M108 83 L118 85 L108 87 Z" fill="#5C3A1E"/>
            <circle cx="103" cy="83" r="2" fill="#5C3A1E"/>
            <path d="M92 130 L85 155 L95 140 Z" fill="#C8A951"/>
            <path d="M100 132 L100 160 L105 140 Z" fill="#C8A951"/>
            <path d="M108 130 L115 155 L105 140 Z" fill="#C8A951"/>
          </svg>
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>Safarilink</h1>
          <p className="text-[10px] sm:text-xs text-sf-gold-light/80">HR Compliance & Policy Portal</p>
        </div>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center bg-white/5 rounded-xl p-1 gap-0.5">
        <button
          onClick={() => onViewChange("bulletin")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            activeView === "bulletin"
              ? "bg-sf-gold text-sf-brown shadow-sm"
              : "text-sf-gold-light/80 hover:text-white hover:bg-white/5"
          )}
        >
          <LayoutDashboard className="w-4 h-4" /> Bulletin Board
        </button>
        <button
          onClick={() => onViewChange("manuals")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            activeView === "manuals"
              ? "bg-sf-gold text-sf-brown shadow-sm"
              : "text-sf-gold-light/80 hover:text-white hover:bg-white/5"
          )}
        >
          <BookOpen className="w-4 h-4" /> Policy Manuals
        </button>
      </nav>

      {/* Desktop Right */}
      <div className="hidden md:flex items-center gap-2 relative">
        {activeView === "manuals" && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sf-gold-light/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search policies..."
              className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-sf-gold-light/40 focus:outline-none focus:ring-2 focus:ring-sf-gold/40 focus:border-sf-gold/30 w-48 lg:w-64 transition-all"
            />
          </div>
        )}

        <button
          onClick={onToggleDark}
          className="p-2 rounded-xl text-sf-gold-light/70 hover:text-white hover:bg-white/5 transition-all duration-200"
          title={isDark ? "Light Mode" : "Dark Mode"}
        >
          {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-sf-gold-light/70 hover:text-white hover:bg-white/5 transition-all duration-200"
          title="Settings"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center space-x-2.5 border-l border-white/10 pl-3 ml-1">
          <div className="relative">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ring-2 transition-all",
              isAdmin ? "bg-sf-gold text-sf-brown ring-sf-gold/30" : "bg-sf-brown-light text-sf-gold-light ring-white/10"
            )}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="text-xs">
            <p className="font-semibold text-white/90">{user.displayName}</p>
            <p className="text-sf-gold-light/60 capitalize">{isAdmin ? "Administrator" : "Staff"}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 rounded-xl text-sf-gold-light/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ml-1"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden p-2 rounded-xl text-sf-gold-light/70 hover:text-white hover:bg-white/5 transition-all"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="absolute top-full left-0 right-0 bg-sf-brown dark:bg-slate-900 border-t border-white/10 p-4 space-y-3 md:hidden shadow-2xl z-50">
          {/* View Toggle */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => { onViewChange("bulletin"); setShowMobileMenu(false); }}
              className={cn(
                "flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeView === "bulletin"
                  ? "bg-sf-gold text-sf-brown shadow-sm"
                  : "text-sf-gold-light/70 hover:text-white"
              )}
            >
              <LayoutDashboard className="w-4 h-4" /> Board
            </button>
            <button
              onClick={() => { onViewChange("manuals"); setShowMobileMenu(false); }}
              className={cn(
                "flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeView === "manuals"
                  ? "bg-sf-gold text-sf-brown shadow-sm"
                  : "text-sf-gold-light/70 hover:text-white"
              )}
            >
              <BookOpen className="w-4 h-4" /> Manuals
            </button>
          </div>

          {/* Search (mobile) */}
          {activeView === "manuals" && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sf-gold-light/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search policies..."
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-sf-gold-light/40 focus:outline-none focus:ring-2 focus:ring-sf-gold/40"
              />
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
              isAdmin ? "bg-sf-gold text-sf-brown" : "bg-sf-brown-light text-sf-gold-light"
            )}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">{user.displayName}</p>
              <p className="text-sf-gold-light/60 text-xs capitalize">{isAdmin ? "Administrator" : "Staff"}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onToggleDark}
              className="flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-xl text-sm text-sf-gold-light/70 hover:text-white hover:bg-white/10 transition-all justify-center"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDark ? "Light" : "Dark"}
            </button>
            <button
              onClick={() => { onOpenSettings(); setShowMobileMenu(false); }}
              className="flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-xl text-sm text-sf-gold-light/70 hover:text-white hover:bg-white/10 transition-all justify-center"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>

          <button
            onClick={() => { onLogout(); setShowMobileMenu(false); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 rounded-xl text-sm text-red-400 hover:bg-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
