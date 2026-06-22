import { X } from "lucide-react";
import { useState } from "react";

interface NewDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
}

export function NewDocModal({ isOpen, onClose, onSave }: NewDocModalProps) {
  const [title, setTitle] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(title.trim());
    setTitle("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Create Compliance Framework Document
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-sm"
              placeholder="e.g., Flight Crew Operational Guidelines"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 font-medium hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition-colors shadow-xs"
            >
              Save Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
