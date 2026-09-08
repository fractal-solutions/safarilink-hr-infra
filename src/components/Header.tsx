import { useState, useRef } from "react";
import { Settings, LogOut, Moon, Sun, Search, Menu, X, LayoutDashboard, BookOpen, Eye } from "lucide-react";
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
  const [logoBlurred, setLogoBlurred] = useState(false);
  const clickTimerRef = useRef<number | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const scrollActivePaneToTop = () => {
    let target: HTMLElement | null = null;
    let best = 0;
    document.querySelectorAll<HTMLElement>("main").forEach((main) => {
      const nodes: HTMLElement[] = Array.from(main.querySelectorAll<HTMLElement>("*"));
      for (const el of [main, ...nodes]) {
        const style = window.getComputedStyle(el);
        if (!/(auto|scroll)/.test(style.overflowY)) continue;
        if (el.scrollHeight > el.clientHeight + 8) {
          const area = el.clientWidth * el.clientHeight;
          if (area > best) {
            best = area;
            target = el;
          }
        }
      }
    });
    if (target) {
      target.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogoClick = () => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setLogoBlurred((b) => !b);
      return;
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      scrollActivePaneToTop();
    }, 220);
  };

  return (
    <header className="relative bg-sf-brown text-white px-4 sm:px-6 py-2 sm:py-2.5 flex justify-between items-center shrink-0 z-40 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)]">
      {/* Brand accent hairline */}
      <div aria-hidden className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sf-gold/0 via-sf-gold to-sf-gold/0" />
      {/* Logo */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={handleLogoClick}
          aria-label="Safarilink — scroll to top (double-click toggles logo privacy blur)"
          aria-pressed={logoBlurred}
          className="group relative shrink-0 rounded-lg outline-none cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-sf-gold/50"
        >
          <img
            src="/assets/12.png"
            alt="Safarilink"
            draggable={false}
            className={cn(
              "h-8 sm:h-9 lg:h-10 w-auto object-contain drop-shadow-sm transition-all duration-300",
              logoBlurred && "blur-[8px] saturate-50 opacity-80"
            )}
          />
          {logoBlurred && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-5 h-5 text-white drop-shadow-md" />
            </span>
          )}
        </button>
        <div className="hidden xs:flex flex-col border-l border-white/15 pl-2.5 sm:pl-3 leading-tight">
          <span className="text-[10px] sm:text-[11px] font-semibold text-sf-gold-light tracking-[0.08em] uppercase">HR Compliance</span>
          <span className="text-[10px] sm:text-[11px] text-sf-gold-light/60 tracking-wide">&amp; Policy Portal</span>
        </div>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/10 bg-black/10 p-1 backdrop-blur-sm">
        <button
          onClick={() => onViewChange("bulletin")}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
            activeView === "bulletin"
              ? "bg-gradient-to-b from-[#dfc063] to-sf-gold text-sf-brown-dark shadow-sm"
              : "text-sf-gold-light/80 hover:text-white hover:bg-white/10"
          )}
        >
          <LayoutDashboard className="w-4 h-4" /> Bulletin Board
        </button>
        <button
          onClick={() => onViewChange("manuals")}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
            activeView === "manuals"
              ? "bg-gradient-to-b from-[#dfc063] to-sf-gold text-sf-brown-dark shadow-sm"
              : "text-sf-gold-light/80 hover:text-white hover:bg-white/10"
          )}
        >
          <BookOpen className="w-4 h-4" /> Policy Manuals
        </button>
      </nav>

      {/* Desktop Right */}
      <div className="hidden md:flex items-center gap-2 relative">
        {/* Desktop search — space is always reserved so the center nav never shifts */}
        <div
          className={cn(
            "relative transition-opacity duration-200",
            activeView === "manuals" ? "opacity-100" : "pointer-events-none invisible opacity-0"
          )}
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sf-gold-light/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search policies..."
            className="pl-9 pr-3 py-1.5 bg-black/15 border border-white/10 rounded-full text-sm text-white placeholder-sf-gold-light/40 focus:outline-none focus:ring-2 focus:ring-sf-gold/40 focus:border-sf-gold/40 focus:bg-black/25 w-40 lg:w-60 transition-all"
          />
        </div>

        <div className="w-px h-6 bg-white/10" />

        <button
          onClick={onToggleDark}
          className="p-2 rounded-full text-sf-gold-light/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200"
          title={isDark ? "Light Mode" : "Dark Mode"}
        >
          {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full text-sf-gold-light/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200"
          title="Settings"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 border-l border-white/10 pl-3 ml-1">
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ring-2 transition-all",
            isAdmin
              ? "bg-gradient-to-b from-[#dfc063] to-sf-gold text-sf-brown-dark ring-sf-gold/40 shadow-sm"
              : "bg-white/10 text-sf-gold-light ring-white/15"
          )}>
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-xs hidden lg:block min-w-0">
            <p className="font-semibold text-white/90 max-w-[120px] truncate leading-tight">{user.displayName}</p>
            <p className="text-sf-gold-light/60 capitalize leading-tight">{isAdmin ? "Administrator" : "Staff"}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 rounded-full text-sf-gold-light/70 hover:text-red-400 hover:bg-red-500/15 active:scale-95 transition-all duration-200"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden p-2 rounded-full text-sf-gold-light/70 hover:text-white hover:bg-white/10 transition-all"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="absolute top-full left-0 right-0 bg-gradient-to-b from-sf-brown to-[#4a2b14] border-t border-white/10 p-4 space-y-3 md:hidden shadow-2xl z-50">
          {/* Brand accent hairline */}
          <div aria-hidden className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sf-gold/0 via-sf-gold to-sf-gold/0" />
          {/* View Toggle */}
          <div className="flex gap-1 rounded-full border border-white/10 bg-black/10 p-1">
            <button
              onClick={() => { onViewChange("bulletin"); setShowMobileMenu(false); }}
              className={cn(
                "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-full text-sm font-medium transition-all",
                activeView === "bulletin"
                  ? "bg-gradient-to-b from-[#dfc063] to-sf-gold text-sf-brown-dark shadow-sm"
                  : "text-sf-gold-light/70 hover:text-white hover:bg-white/10"
              )}
            >
              <LayoutDashboard className="w-4 h-4" /> Board
            </button>
            <button
              onClick={() => { onViewChange("manuals"); setShowMobileMenu(false); }}
              className={cn(
                "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-full text-sm font-medium transition-all",
                activeView === "manuals"
                  ? "bg-gradient-to-b from-[#dfc063] to-sf-gold text-sf-brown-dark shadow-sm"
                  : "text-sf-gold-light/70 hover:text-white hover:bg-white/10"
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
                className="w-full pl-9 pr-3 py-2.5 bg-black/15 border border-white/10 rounded-full text-sm text-white placeholder-sf-gold-light/40 focus:outline-none focus:ring-2 focus:ring-sf-gold/40 focus:bg-black/25"
              />
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-white/10",
              isAdmin
                ? "bg-gradient-to-b from-[#dfc063] to-sf-gold text-sf-brown-dark"
                : "bg-white/10 text-sf-gold-light"
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
              className="flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-full text-sm text-sf-gold-light/70 hover:text-white hover:bg-white/10 transition-all justify-center active:scale-[0.98]"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDark ? "Light" : "Dark"}
            </button>
            <button
              onClick={() => { onOpenSettings(); setShowMobileMenu(false); }}
              className="flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-full text-sm text-sf-gold-light/70 hover:text-white hover:bg-white/10 transition-all justify-center active:scale-[0.98]"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>

          <button
            onClick={() => { onLogout(); setShowMobileMenu(false); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 rounded-full text-sm text-red-400 hover:bg-red-500/20 transition-all active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
