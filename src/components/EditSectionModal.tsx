import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { RichTextEditor } from "./RichTextEditor";

interface EditSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
  initialTitle: string;
  initialContent: string;
}

export function EditSectionModal({
  isOpen,
  onClose,
  onSave,
  initialTitle,
  initialContent,
}: EditSectionModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
    }
  }, [isOpen, initialTitle, initialContent]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;
    onSave(title.trim(), content.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 border border-sf-cream-dark max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sf-brown">
            Edit Section Block
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
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Section Content
            </label>
            <RichTextEditor
              key={initialContent}
              content={content}
              onChange={setContent}
              placeholder="Edit your section content here..."
            />
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
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
