import { X } from "lucide-react";
import { useState } from "react";
import { RichTextEditor } from "./RichTextEditor";

interface NewSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
}

export function NewSectionModal({
  isOpen,
  onClose,
  onSave,
}: NewSectionModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;
    onSave(title.trim(), content.trim());
    setTitle("");
    setContent("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 border border-sf-cream-dark max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sf-brown">
            Add Functional Section Block
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
              Section Header / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-sf-cream-dark rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm"
              placeholder="e.g., Section 1.4: Emergency Cockpit Protocols"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Section Content
            </label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Write your section content here..."
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Use the toolbar to format text, add headings, lists, alignment,
              and more.
            </p>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 font-medium hover:bg-sf-cream rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-sf-brown hover:bg-sf-brown-dark text-white font-medium rounded-lg transition-colors shadow-xs"
            >
              Inject Section Block
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
