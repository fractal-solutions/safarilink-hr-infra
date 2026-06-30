import { useState } from "react";
import { Palette, Check } from "lucide-react";
import * as api from "@/api";
import { cn } from "@/lib/utils";
import { THEME_META } from "@/themes";

interface ThemePickerProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  userId: string;
}

export function ThemePicker({ currentTheme, onThemeChange, userId }: ThemePickerProps) {
  const [saving, setSaving] = useState<string | null>(null);

  const handleSelect = async (themeId: string) => {
    if (themeId === currentTheme) return;
    setSaving(themeId);
    const result = await api.updateTheme(userId, themeId);
    if (result.ok) {
      onThemeChange(themeId);
    }
    setSaving(null);
  };

  return (
    <div>
      <h4 className="text-sm font-bold text-sf-brown dark:text-slate-200 flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-sf-gold" /> Theme
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {THEME_META.map((theme) => {
          const isActive = currentTheme === theme.id;
          const isSaving = saving === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              disabled={isSaving}
              className={cn(
                "text-left p-3 rounded-xl border-2 transition-all relative group",
                isActive
                  ? "border-sf-gold bg-sf-cream/50 dark:bg-slate-700/50 ring-1 ring-sf-gold/30"
                  : "border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500"
              )}
            >
              {isActive && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-sf-gold rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-sf-brown" />
                </div>
              )}
              <div className="flex gap-1.5 mb-2">
                {theme.colors.map((color, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{theme.name}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{theme.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
