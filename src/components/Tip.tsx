import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TipProps {
  label: string;
  description?: string;
  side?: "top" | "bottom";
  align?: "left" | "center" | "right";
  children: ReactNode;
}

export function Tip({ label, description, side = "bottom", align = "center", children }: TipProps) {
  return (
    <span className="relative inline-flex group/tip focus-within:z-10">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[130] w-max max-w-[250px] px-2.5 py-1.5 rounded-lg text-left opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          "bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-xl ring-1 ring-white/10 backdrop-blur-sm",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          align === "left" && "left-0",
          align === "right" && "right-0",
          align === "center" && "left-1/2 -translate-x-1/2"
        )}
      >
        <span className="block text-[11px] font-bold leading-snug">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[10.5px] font-normal leading-snug text-slate-300 dark:text-slate-300">
            {description}
          </span>
        )}
      </span>
    </span>
  );
}
