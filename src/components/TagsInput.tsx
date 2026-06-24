import { useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagsInput({ tags, onChange, disabled }: TagsInputProps) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const tagColors = [
    "bg-sf-cream text-sf-brown border-sf-cream-dark dark:bg-sf-brown/30 dark:text-sf-gold dark:border-sf-brown-light",
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700",
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700",
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
            tagColors[i % tagColors.length]
          )}
        >
          {tag}
          {!disabled && (
            <button onClick={() => removeTag(tag)} className="hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addTag(); }
            }}
            placeholder="Add tag..."
            className="w-20 px-2 py-0.5 text-xs border border-sf-cream-dark dark:border-slate-600 bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-sf-gold"
          />
          {input.trim() && (
            <button onClick={addTag} className="text-sf-gold hover:text-sf-gold-dark">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
